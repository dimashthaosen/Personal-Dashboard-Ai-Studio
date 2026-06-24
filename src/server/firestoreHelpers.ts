import { QuerySnapshot, DocumentSnapshot } from "firebase-admin/firestore";
import { serverDb } from "./agentTools";

export function docsToArray(snap: QuerySnapshot): any[] {
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function getUserCollection(userId: string, name: string) {
  return serverDb.collection(`users/${userId}/${name}`);
}
