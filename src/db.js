import { db } from './firebase.js';
import { 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc
} from 'firebase/firestore';

export async function getAll(collectionName) {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error getting all from ${collectionName}:`, error);
    throw error;
  }
}

export async function add(collectionName, data) {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  } catch (error) {
    console.error(`Error adding to ${collectionName}:`, error);
    throw error;
  }
}

export async function update(collectionName, data) {
  try {
    const { id, ...updateData } = data;
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, updateData);
    return id;
  } catch (error) {
    console.error(`Error updating ${collectionName}:`, error);
    throw error;
  }
}

export async function remove(collectionName, id) {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return id;
  } catch (error) {
    console.error(`Error deleting from ${collectionName}:`, error);
    throw error;
  }
}

export async function deleteAll(collectionName) {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    return querySnapshot.size;
  } catch (error) {
    console.error(`Error deleting all from ${collectionName}:`, error);
    throw error;
  }
}
