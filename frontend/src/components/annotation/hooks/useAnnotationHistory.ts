"use client";

import { useCallback, useRef, useState } from "react";
import type { BoundingBoxData } from "@/types/annotation";

const MAX_HISTORY_SIZE = 50;

interface HistoryState {
  past: BoundingBoxData[][];
  present: BoundingBoxData[];
  future: BoundingBoxData[][];
}

interface UseAnnotationHistoryReturn {
  annotations: BoundingBoxData[];
  setAnnotations: (
    annotations:
      | BoundingBoxData[]
      | ((prev: BoundingBoxData[]) => BoundingBoxData[])
  ) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useAnnotationHistory(
  initialAnnotations: BoundingBoxData[] = []
): UseAnnotationHistoryReturn {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialAnnotations,
    future: [],
  });

  // Ref to track the current present for pushHistory
  const presentRef = useRef(history.present);
  presentRef.current = history.present;

  // Set annotations without pushing to history
  // Used during drag/resize operations
  const setAnnotations = useCallback(
    (
      annotations:
        | BoundingBoxData[]
        | ((prev: BoundingBoxData[]) => BoundingBoxData[])
    ) => {
      setHistory((prev) => {
        const newPresent =
          typeof annotations === "function"
            ? annotations(prev.present)
            : annotations;
        return {
          ...prev,
          present: newPresent,
        };
      });
    },
    []
  );

  // Push current state to history (call before making changes)
  // This creates a snapshot that can be undone
  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const newPast = [...prev.past, prev.present].slice(-MAX_HISTORY_SIZE);
      return {
        past: newPast,
        present: prev.present,
        future: [], // Clear future on new action
      };
    });
  }, []);

  // Undo: restore previous state
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const newPast = prev.past.slice(0, -1);
      const previous = prev.past[prev.past.length - 1];
      const newFuture = [prev.present, ...prev.future];

      return {
        past: newPast,
        present: previous,
        future: newFuture,
      };
    });
  }, []);

  // Redo: restore next state
  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const newFuture = prev.future.slice(1);
      const next = prev.future[0];
      const newPast = [...prev.past, prev.present];

      return {
        past: newPast,
        present: next,
        future: newFuture,
      };
    });
  }, []);

  return {
    annotations: history.present,
    setAnnotations,
    pushHistory,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
