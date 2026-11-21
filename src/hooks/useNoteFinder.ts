import { useCallback, useEffect, useRef, useState } from 'react';

import type { TNoteFinderStatus } from '@/types/status';
import type { TTranscription } from '@/types/transcription';
import type { TNoteFinderRequest, TNoteFinderResponse } from '@/types/worker';

type TPending = {
  resolve: (result: TTranscription) => void;
  reject: (error: Error) => void;
  onProgress: (fraction: number) => void;
};

type TReadyWaiter = { resolve: () => void; reject: (error: Error) => void };

export function useNoteFinder() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<number, TPending>());
  const waitersRef = useRef<TReadyWaiter[]>([]);
  const readyRef = useRef(false);
  const nextIdRef = useRef(1);
  const [status, setStatus] = useState<TNoteFinderStatus>({ phase: 'idle' });

  const handleMessage = useCallback((event: MessageEvent<TNoteFinderResponse>) => {
    const message = event.data;
    switch (message.type) {
      case 'downloading':
        setStatus({ phase: 'downloading', loaded: message.loaded, total: message.total });
        break;
      case 'warming':
        setStatus({ phase: 'warming' });
        break;
      case 'ready':
        readyRef.current = true;
        setStatus({
          phase: 'ready',
          backend: message.backend,
          loadMs: message.loadMs,
          bytes: message.bytes,
        });
        waitersRef.current.forEach((waiter) => waiter.resolve());
        waitersRef.current = [];
        break;
      case 'progress':
        pendingRef.current.get(message.id)?.onProgress(message.fraction);
        break;
      case 'result': {
        const pending = pendingRef.current.get(message.id);
        pendingRef.current.delete(message.id);
        pending?.resolve(message.transcription);
        break;
      }
      case 'error': {
        if (message.id === null) {
          setStatus({ phase: 'error', message: message.message });
          waitersRef.current.forEach((waiter) => waiter.reject(new Error(message.message)));
          waitersRef.current = [];
          break;
        }
        const pending = pendingRef.current.get(message.id);
        pendingRef.current.delete(message.id);
        pending?.reject(new Error(message.message));
        break;
      }
    }
  }, []);

  const send = useCallback(
    (request: TNoteFinderRequest, transfer: Transferable[] = []) => {
      if (!workerRef.current) {
        const worker = new Worker(new URL('../workers/noteFinder.worker.ts', import.meta.url), {
          type: 'module',
        });
        worker.addEventListener('message', handleMessage);
        workerRef.current = worker;
      }
      workerRef.current.postMessage(request, transfer);
    },
    [handleMessage]
  );

  const load = useCallback((): Promise<void> => {
    if (readyRef.current) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const first = waitersRef.current.length === 0;
      waitersRef.current.push({ resolve, reject });
      if (first) {
        setStatus({ phase: 'downloading', loaded: 0, total: 0 });
        send({ type: 'load', origin: window.location.origin });
      }
    });
  }, [send]);

  const transcribe = useCallback(
    async (audio: Float32Array<ArrayBuffer>, onProgress: (fraction: number) => void) => {
      await load();
      return new Promise<TTranscription>((resolve, reject) => {
        const id = nextIdRef.current;
        nextIdRef.current += 1;
        pendingRef.current.set(id, { resolve, reject, onProgress });
        const copy = Float32Array.from(audio);
        send({ type: 'transcribe', id, audio: copy }, [copy.buffer]);
      });
    },
    [load, send]
  );

  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      pending.forEach(({ reject }) => reject(new Error('The page was closed.')));
      pending.clear();
    };
  }, []);

  return { status, load, transcribe };
}
