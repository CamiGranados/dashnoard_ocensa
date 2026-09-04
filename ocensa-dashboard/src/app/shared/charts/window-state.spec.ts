import { describe, it, expect } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { createWindowState } from './window-state';

function makeWindow(initialTotal: number, size = 60) {
  const total = signal(initialTotal);
  const state = TestBed.runInInjectionContext(() => createWindowState(total, size));
  TestBed.tick(); // deja correr el effect de reencuadre
  return { total, state };
}

describe('createWindowState', () => {
  it('sin datos: rango [0, 0]', () => {
    const { state } = makeWindow(0);
    expect(state.range()).toEqual([0, 0]);
    expect(state.position()).toBe(0);
  });

  it('reencuadra en los últimos `size` puntos al llegar datos', () => {
    const { total, state } = makeWindow(0, 60);
    total.set(200);
    TestBed.tick();
    expect(state.range()).toEqual([140, 199]);
    expect(state.position()).toBe(140);
  });

  it('con menos puntos que `size`, muestra todo desde 0', () => {
    const { state } = makeWindow(20, 60);
    expect(state.range()).toEqual([0, 19]);
  });

  it('move(p) desplaza la ventana; el fin se recorta al último índice', () => {
    const { state } = makeWindow(200, 60);
    state.move(10);
    expect(state.range()).toEqual([10, 70]);
    state.move(190);
    expect(state.range()).toEqual([190, 199]);
  });

  it('reset() vuelve a los últimos `size` puntos', () => {
    const { state } = makeWindow(200, 60);
    state.move(0);
    expect(state.range()).toEqual([0, 60]);
    state.reset();
    expect(state.range()).toEqual([140, 199]);
  });
});
