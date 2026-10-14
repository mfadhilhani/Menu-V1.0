"use client";
import { ReactNode } from "react";
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function Item({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.65 : 1, position: "relative" as const, zIndex: isDragging ? 5 : undefined };
  const handle = (
    <span ref={setActivatorNodeRef} className="dh" title="Geser untuk pindah urutan" {...attributes} {...listeners}>⠿</span>
  );
  return <div ref={setNodeRef} style={style}>{children(handle)}</div>;
}

export function SortableList<T extends { id: string }>({ items, onChange, children }: { items: T[]; onChange: (n: T[]) => void; children: (it: T, i: number, handle: ReactNode) => ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const end = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const a = items.findIndex((x) => x.id === active.id), b = items.findIndex((x) => x.id === over.id);
    if (a >= 0 && b >= 0) onChange(arrayMove(items, a, b));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((it, i) => (
          <Item key={it.id} id={it.id}>{(h) => children(it, i, h)}</Item>
        ))}
      </SortableContext>
    </DndContext>
  );
}
