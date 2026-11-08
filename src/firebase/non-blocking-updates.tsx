'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Recursively removes properties with undefined values from objects/arrays
 * so Firestore doesn't throw 'Unsupported field value: undefined'.
 */
function removeUndefined<T>(data: T): T {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data;
  }
  // If it's a Firestore special object (FieldValue, DocumentReference, Timestamp, etc.)
  if ((data as any).constructor && (data as any).constructor.name !== 'Object' && !Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => removeUndefined(item)) as unknown as T;
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = removeUndefined(value);
    }
  }
  return clean;
}

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options?: SetOptions) {
  try {
    const cleanData = removeUndefined(data);
    const promise = (options ? setDoc(docRef, cleanData, options) : setDoc(docRef, cleanData))
      .catch(error => {
        console.error("Firestore setDoc error:", error);
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'write',
            requestResourceData: cleanData,
          })
        );
      });
    return promise;
  } catch (error) {
    console.error("Firestore setDoc sync error:", error);
  }
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  try {
    const cleanData = removeUndefined(data);
    const promise = addDoc(colRef, cleanData)
      .catch(error => {
        console.error("Firestore addDoc error:", error);
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: colRef.path,
            operation: 'create',
            requestResourceData: cleanData,
          })
        );
      });
    return promise;
  } catch (error) {
    console.error("Firestore addDoc sync error:", error);
  }
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  try {
    const cleanData = removeUndefined(data);
    const promise = updateDoc(docRef, cleanData)
      .catch(error => {
        console.error("Firestore updateDoc error:", error);
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: cleanData,
          })
        );
      });
    return promise;
  } catch (error) {
    console.error("Firestore updateDoc sync error:", error);
  }
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      )
    });
}