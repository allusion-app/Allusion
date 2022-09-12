export type CancellablePromise<T> = Promise<T> & { cancel: () => void };

/**
 * Like Promise.all, but runs batches of N promises in sequence
 * @param batchSize The amount of promises in a batch
 * @param proms The promises to run
 */
export async function promiseAllBatch<T>(batchSize = 50, proms: Promise<T>[]) {
  const res: T[] = [];
  for (let i = 0; i < proms.length; i += batchSize) {
    res.push(...(await Promise.all(proms.slice(i, i + batchSize))));
  }
  return res;
}

/**
 * Like Promise.all, but only runs N promises in parallel
 * https://gist.github.com/jcouyang/632709f30e12a7879a73e9e132c0d56b
 * @param n The amount of promises to run in parallel
 * @param list The promises to run
 * @param progressCallback Returns the progress as a value between 0 and 1
 * @param cancel A callback function that, when returning true, can cancel any new promises from being awaited
 */
export function promiseAllLimit<T>(
  collection: Array<() => Promise<T>>,
  n: number = 100,
  progressCallback?: (progress: number) => void,
  cancel?: () => boolean,
): Promise<T[]> {
  // Prevents returning a Promise that is never resolved!
  if (collection.length === 0) {
    return new Promise((resolve) => resolve([]));
  }

  let i = 0;
  let jobsLeft = collection.length;
  const outcome: T[] = [];
  let rejected = false;
  // create a new promise and capture reference to resolve and reject to avoid nesting of code
  let resolve: (o: T[]) => void;
  let reject: (e: Error) => void;
  const pendingPromise: Promise<T[]> = new Promise(function (res, rej) {
    resolve = res;
    reject = rej;
  });

  // execute the j'th thunk
  function runJob(j: number) {
    collection[j]()
      .then((result) => {
        if (rejected) {
          return; // no op!
        }
        jobsLeft--;
        outcome[j] = result;

        progressCallback?.(1 - jobsLeft / collection.length);
        if (cancel?.()) {
          rejected = true;
          console.log('CANCELLING!');
          return;
        }

        if (jobsLeft <= 0) {
          resolve(outcome);
        } else if (i < collection.length) {
          runJob(i);
          i++;
        } else {
          return; // nothing to do here.
        }
      })
      .catch((e) => {
        if (rejected) {
          return; // no op!
        }
        rejected = true;
        reject(e);
        return;
      });
  }

  // bootstrap, while handling cases where the length of the given array is smaller than maxConcurrent jobs
  while (i < Math.min(collection.length, n)) {
    runJob(i);
    i++;
  }

  return pendingPromise;
}
