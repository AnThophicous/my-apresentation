import * as THREE from 'three';
import { BOOKS } from '@/content/books';
import { Emitter } from '@/core/Emitter';
import { damp, randomBetween, seededRandom } from '@/core/math';
import { Book, createCausticUniforms } from './Book';

export type WaterLevel = (x: number, z: number) => number;

const CLICK_TOLERANCE = 7;
const CLICK_DURATION = 650;
const SURFACE_OFFSET = 0.05;
const RECYCLE_ABOVE = 7.5;
const RECYCLE_BEHIND = 6;
const SHALLOW_LIMIT = -10;
const FLAT_ON_WATER = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

interface Grab {
  book: Book;
  plane: THREE.Plane;
  offset: THREE.Vector3;
  startX: number;
  startY: number;
  startTime: number;
  moved: boolean;
}

export class BookShoal {
  readonly group = new THREE.Group();
  readonly books: Book[];
  readonly opened = new Emitter<Book>();
  readonly grabbed = new Emitter<Book>();
  readonly released = new Emitter<Book>();
  readonly caustics = createCausticUniforms();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2(10, 10);
  private readonly random = seededRandom(23);
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly previous = new THREE.Vector3();
  private readonly spin = new THREE.Quaternion();
  private readonly facing = new THREE.Quaternion();
  private readonly look = new THREE.Matrix4();
  private readonly tiltEuler = new THREE.Euler();
  private hovered: Book | null = null;
  private grab: Grab | null = null;

  constructor(atlasSize: number, anisotropy: number) {
    this.books = BOOKS.map((entry, index) => new Book(entry, index, atlasSize, anisotropy, this.caustics));
    this.books.forEach((book) => this.group.add(book.mesh));
  }

  get hoveredBook(): Book | null {
    return this.grab?.book ?? this.hovered;
  }

  get isHolding(): boolean {
    return this.grab !== null;
  }

  pointAt(normalizedX: number, normalizedY: number, camera: THREE.Camera, enabled: boolean): void {
    this.pointer.set(normalizedX, normalizedY);
    if (!enabled) {
      this.hovered = null;
      return;
    }
    this.raycaster.setFromCamera(this.pointer, camera);
    const meshes = this.books.filter((book) => book.mesh.visible).map((book) => book.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    this.hovered = hit ? (hit.object.userData.book as Book) : null;
  }

  press(clientX: number, clientY: number, camera: THREE.Camera): boolean {
    const book = this.hovered;
    if (!book) return false;
    this.raycaster.setFromCamera(this.pointer, camera);
    const hit = this.raycaster.intersectObject(book.mesh, false)[0];
    if (!hit) return false;
    const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point);
    this.grab = {
      book,
      plane,
      offset: book.mesh.position.clone().sub(hit.point),
      startX: clientX,
      startY: clientY,
      startTime: performance.now(),
      moved: false,
    };
    book.state = 'held';
    this.grabbed.emit(book);
    return true;
  }

  drag(clientX: number, clientY: number): void {
    if (!this.grab) return;
    if (Math.hypot(clientX - this.grab.startX, clientY - this.grab.startY) > CLICK_TOLERANCE)
      this.grab.moved = true;
  }

  release(): void {
    const grab = this.grab;
    if (!grab) return;
    this.grab = null;
    const isClick = !grab.moved && performance.now() - grab.startTime < CLICK_DURATION;
    grab.book.state = 'rising';
    grab.book.velocity.clampLength(0, 6);
    if (isClick) this.opened.emit(grab.book);
    else this.released.emit(grab.book);
  }

  scatterAround(camera: THREE.Camera): void {
    this.books.forEach((book, index) => this.respawn(book, camera, index * 1.1 - 9));
  }

  update(time: number, delta: number, camera: THREE.Camera, waterLevel: WaterLevel, recycle: boolean): void {
    this.caustics.uCausticTime.value = time;
    camera.getWorldDirection(this.forward).setY(0).normalize();
    this.right.crossVectors(this.forward, THREE.Object3D.DEFAULT_UP).normalize();
    for (const book of this.books) {
      if (book.state === 'idle') continue;
      if (book.state === 'held') this.followPointer(book, delta, camera);
      else if (book.state === 'rising') this.rise(book, time, delta, waterLevel);
      else this.float(book, time, delta, waterLevel);
      if (recycle && this.shouldRecycle(book, camera)) this.respawn(book, camera, 0);
      const highlight = book === this.hoveredBook ? 1.06 : 1;
      book.mesh.scale.setScalar(damp(book.mesh.scale.x, highlight, 10, delta));
    }
  }

  private rise(book: Book, time: number, delta: number, waterLevel: WaterLevel): void {
    const { mesh, velocity } = book;
    velocity.x = damp(velocity.x, Math.sin(time * 0.5 + book.phase) * 0.18, 1.2, delta);
    velocity.z = damp(velocity.z, Math.cos(time * 0.4 + book.phase) * 0.14, 1.2, delta);
    velocity.y = damp(velocity.y, book.riseSpeed, 0.8, delta);
    mesh.position.addScaledVector(velocity, delta);
    this.spin.setFromAxisAngle(book.spinAxis, book.spinRate * delta);
    mesh.quaternion.premultiply(this.spin);
    if (mesh.position.y > waterLevel(mesh.position.x, mesh.position.z) - SURFACE_OFFSET * 3)
      book.state = 'surfaced';
  }

  private float(book: Book, time: number, delta: number, waterLevel: WaterLevel): void {
    const { mesh, velocity } = book;
    velocity.multiplyScalar(Math.exp(-delta * 1.5));
    mesh.position.x += velocity.x * delta + Math.sin(time * 0.2 + book.phase) * 0.04 * delta;
    mesh.position.z += velocity.z * delta;
    const surface = waterLevel(mesh.position.x, mesh.position.z) - SURFACE_OFFSET;
    mesh.position.y = damp(mesh.position.y, surface, 6, delta);
    const heading = book.phase + Math.sin(time * 0.1 + book.phase) * 0.2;
    this.facing
      .copy(FLAT_ON_WATER)
      .premultiply(this.spin.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, heading));
    mesh.quaternion.slerp(this.facing, 1 - Math.exp(-delta * 1.4));
  }

  private followPointer(book: Book, delta: number, camera: THREE.Camera): void {
    const grab = this.grab;
    if (!grab) return;
    this.raycaster.setFromCamera(this.pointer, camera);
    if (!this.raycaster.ray.intersectPlane(grab.plane, this.target)) return;
    this.target.add(grab.offset);
    this.previous.copy(book.mesh.position);
    book.mesh.position.lerp(this.target, 1 - Math.exp(-delta * 12));
    book.velocity.copy(book.mesh.position).sub(this.previous).divideScalar(Math.max(delta, 0.001));
    this.look.lookAt(camera.position, book.mesh.position, THREE.Object3D.DEFAULT_UP);
    this.facing.setFromRotationMatrix(this.look);
    this.tiltEuler.set(book.velocity.y * -0.05, book.velocity.x * 0.08, -book.velocity.x * 0.04);
    this.facing.multiply(this.spin.setFromEuler(this.tiltEuler));
    book.mesh.quaternion.slerp(this.facing, 1 - Math.exp(-delta * 8));
  }

  private shouldRecycle(book: Book, camera: THREE.Camera): boolean {
    if (book.state === 'held' || camera.position.y > SHALLOW_LIMIT) return false;
    const above = book.mesh.position.y - camera.position.y;
    const toBook = this.target.copy(book.mesh.position).sub(camera.position).setY(0);
    const behind = toBook.dot(this.forward) < -RECYCLE_BEHIND;
    return above > RECYCLE_ABOVE || behind;
  }

  private respawn(book: Book, camera: THREE.Camera, extraDepth: number): void {
    const random = this.random;
    camera.getWorldDirection(this.forward).setY(0).normalize();
    this.right.crossVectors(this.forward, THREE.Object3D.DEFAULT_UP).normalize();
    book.mesh.position
      .copy(camera.position)
      .addScaledVector(this.forward, randomBetween(random, 6, 10))
      .addScaledVector(this.right, randomBetween(random, -3.2, 3.2));
    book.mesh.position.y = camera.position.y - randomBetween(random, 6, 9) - extraDepth;
    book.mesh.quaternion.setFromEuler(
      new THREE.Euler(random() * Math.PI, random() * Math.PI * 2, random() * Math.PI),
    );
    book.spinAxis.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
    book.spinRate = randomBetween(random, 0.1, 0.45);
    book.riseSpeed = randomBetween(random, 1.1, 1.8);
    book.velocity.set(0, book.riseSpeed * 0.5, 0);
    book.state = 'rising';
    book.mesh.visible = true;
  }
}
