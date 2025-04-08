import { expect, jest, test } from "bun:test";
import { EventEmitter, IEvent } from "../src/event.ts";

test("register and emit an event", () => {
  const listener = jest.fn();
  const event: IEvent = { name: "test_event", data: 123 };

  const emitter = new EventEmitter();
  emitter.on("test_event", listener);
  const emitted = emitter.emit(event);

  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith(event);
  expect(emitted).toBe(true);
});

test("return false when emitting an event with no listeners", () => {
  const event: IEvent = { name: "no_listener_event" };
  const emitter = new EventEmitter();
  const emitted = emitter.emit(event);
  expect(emitted).toBe(false);
});

test("call multiple listeners for the same event", () => {
  const listener1 = jest.fn();
  const listener2 = jest.fn();
  const event: IEvent = { name: "multi_listener" };

  const emitter = new EventEmitter();
  emitter.on("multi_listener", listener1);
  emitter.on("multi_listener", listener2);
  emitter.emit(event);

  expect(listener1).toHaveBeenCalledTimes(1);
  expect(listener1).toHaveBeenCalledWith(event);
  expect(listener2).toHaveBeenCalledTimes(1);
  expect(listener2).toHaveBeenCalledWith(event);
});

test("call listeners in the order they were registered", () => {
  const calls: string[] = [];
  const listener1 = jest.fn(() => calls.push("listener1"));
  const listener2 = jest.fn(() => calls.push("listener2"));
  const event: IEvent = { name: "order_test" };

  const emitter = new EventEmitter();
  emitter.on("order_test", listener1);
  emitter.on("order_test", listener2);
  emitter.emit(event);

  expect(calls).toEqual(["listener1", "listener2"]);
});

test("correct report listener count", () => {
  const listener1 = () => {};
  const listener2 = () => {};

  const emitter = new EventEmitter();
  expect(emitter.listenerCount("count_test")).toBe(0);
  emitter.on("count_test", listener1);
  expect(emitter.listenerCount("count_test")).toBe(1);
  emitter.on("count_test", listener2);
  expect(emitter.listenerCount("count_test")).toBe(2);
  // Adding same listener again should not increase count (Set behavior)
  emitter.on("count_test", listener1);
  expect(emitter.listenerCount("count_test")).toBe(2);
});

test("remove a specific listener using off()", () => {
  const listener1 = jest.fn();
  const listener2 = jest.fn();
  const event: IEvent = { name: "off_test" };

  const emitter = new EventEmitter();
  emitter.on("off_test", listener1);
  emitter.on("off_test", listener2);
  expect(emitter.listenerCount("off_test")).toBe(2);

  emitter.off("off_test", listener1);
  expect(emitter.listenerCount("off_test")).toBe(1);

  emitter.emit(event);
  expect(listener1).not.toHaveBeenCalled();
  expect(listener2).toHaveBeenCalledTimes(1);
  expect(listener2).toHaveBeenCalledWith(event);
});

test("should not throw when removing a non-existent listener", () => {
  const listener = () => {};
  const emitter = new EventEmitter();
  expect(() => emitter.off("non_existent", listener)).not.toThrow();
  expect(() => emitter.off("exists_but_wrong_listener", listener)).not
    .toThrow();
});

test("remove all listeners for a specific event", () => {
  const listener1 = jest.fn();
  const listener2 = jest.fn();
  const listenerOther = jest.fn();
  const event1: IEvent = { name: "remove_specific" };
  const eventOther: IEvent = { name: "other_event" };

  const emitter = new EventEmitter();
  emitter.on("remove_specific", listener1);
  emitter.on("remove_specific", listener2);
  emitter.on("other_event", listenerOther);
  expect(emitter.listenerCount("remove_specific")).toBe(2);
  expect(emitter.listenerCount("other_event")).toBe(1);

  emitter.removeAllListeners("remove_specific");
  expect(emitter.listenerCount("remove_specific")).toBe(0);
  expect(emitter.listenerCount("other_event")).toBe(1); // Should remain

  emitter.emit(event1);
  emitter.emit(eventOther);

  expect(listener1).not.toHaveBeenCalled();
  expect(listener2).not.toHaveBeenCalled();
  expect(listenerOther).toHaveBeenCalledTimes(1);
});

test("remove all listeners for all events", () => {
  const listener1 = jest.fn();
  const listener2 = jest.fn();
  const event1: IEvent = { name: "remove_all_1" };
  const event2: IEvent = { name: "remove_all_2" };

  const emitter = new EventEmitter();
  emitter.on("remove_all_1", listener1);
  emitter.on("remove_all_2", listener2);
  expect(emitter.listenerCount("remove_all_1")).toBe(1);
  expect(emitter.listenerCount("remove_all_2")).toBe(1);

  emitter.removeAllListeners();
  expect(emitter.listenerCount("remove_all_1")).toBe(0);
  expect(emitter.listenerCount("remove_all_2")).toBe(0);

  emitter.emit(event1);
  emitter.emit(event2);

  expect(listener1).not.toHaveBeenCalled();
  expect(listener2).not.toHaveBeenCalled();
});

test("clean up map entry when last listener is removed via off()", () => {
  const listener = () => {};
  const eventName = "cleanup_test";

  const emitter = new EventEmitter();
  emitter.on(eventName, listener);
  expect((emitter as any).listeners.has(eventName)).toBe(true); // Access private member for test

  emitter.off(eventName, listener);
  expect(emitter.listenerCount(eventName)).toBe(0);
  expect((emitter as any).listeners.has(eventName)).toBe(false); // Check if key was deleted
});
