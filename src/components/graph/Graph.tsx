"use client";

/**
 * React wrapper around the d3 graph engine (F06). Mounts once, then pushes option/data changes into the
 * engine instead of re-creating it, so positions survive refetches (F06-FR-14).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createGraph, type GraphData, type GraphHandle, type GraphOptions } from "./engine";
import "./graph.css";

export type GraphProps = Partial<GraphOptions> & {
  data: GraphData;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
};

export const Graph = forwardRef<GraphHandle | null, GraphProps>(function Graph(
  { data, className, style, testId, ...options },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<GraphHandle | null>(null);
  const latest = useRef(options);
  latest.current = options;

  useImperativeHandle(ref, () => engine.current as GraphHandle, []);

  useEffect(() => {
    if (!host.current) return;
    // Callbacks read the latest props through the ref so the engine needn't be rebuilt on each render.
    const handle = createGraph(host.current, data, {
      ...latest.current,
      onOpen: (n) => latest.current.onOpen?.(n),
      onSelect: (n) => latest.current.onSelect?.(n),
      topicsOf: latest.current.topicsOf ? (n) => latest.current.topicsOf!(n) : undefined,
    });
    engine.current = handle;
    return () => {
      handle.destroy();
      engine.current = null;
    };
    // Mount once; later changes flow through update() below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { onOpen, onSelect, topicsOf, ...plain } = options;
  void onOpen;
  void onSelect;
  void topicsOf;
  const key = JSON.stringify({ ...plain, topicFilter: plain.topicFilter ? [...plain.topicFilter] : null });

  useEffect(() => {
    engine.current?.update({ ...latest.current, data, topicFilter: latest.current.topicFilter ?? null });
  }, [data, key]);

  return <div ref={host} className={className} style={style} data-testid={testId} />;
});
