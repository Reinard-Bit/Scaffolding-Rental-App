import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  DocumentData, 
  QuerySnapshot 
} from "firebase/firestore";
import { db } from "./firebase";
import { InventoryItem, Customer, Rental, Purchase } from "../types";

// Helper to convert Firestore snapshot to typed array
const convertSnapshot = <T>(snapshot: QuerySnapshot<DocumentData>): T[] => {
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as unknown as T));
};

// --- Inventory Functions ---
export const getInventory = async (): Promise<InventoryItem[]> => {
  const querySnapshot = await getDocs(collection(db, "scaffolding_inventory"));
  return convertSnapshot<InventoryItem>(querySnapshot);
};

export const addInventoryItem = async (item: Omit<InventoryItem, "id">): Promise<InventoryItem> => {
  const docRef = await addDoc(collection(db, "scaffolding_inventory"), item);
  return { ...item, id: docRef.id } as InventoryItem;
};

export const updateInventoryItem = async (item: InventoryItem): Promise<void> => {
  const { id, ...data } = item;
  const docRef = doc(db, "scaffolding_inventory", id);
  await updateDoc(docRef, data);
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "scaffolding_inventory", id));
};

// --- Customer Functions ---
export const getCustomers = async (): Promise<Customer[]> => {
  const querySnapshot = await getDocs(collection(db, "scaffolding_customers"));
  return convertSnapshot<Customer>(querySnapshot);
};

export const addCustomer = async (customer: Omit<Customer, "id">): Promise<Customer> => {
  const docRef = await addDoc(collection(db, "scaffolding_customers"), customer);
  return { ...customer, id: docRef.id } as Customer;
};

export const updateCustomer = async (customer: Customer): Promise<void> => {
  const { id, ...data } = customer;
  const docRef = doc(db, "scaffolding_customers", id);
  await updateDoc(docRef, data);
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "scaffolding_customers", id));
};

// --- Rental Functions ---
export const getRentals = async (): Promise<Rental[]> => {
  const querySnapshot = await getDocs(collection(db, "scaffolding_rentals"));
  return convertSnapshot<Rental>(querySnapshot);
};

export const addRental = async (rental: Omit<Rental, "id">): Promise<Rental> => {
  const docRef = await addDoc(collection(db, "scaffolding_rentals"), rental);
  return { ...rental, id: docRef.id } as Rental;
};

export const updateRental = async (rental: Rental): Promise<void> => {
  const { id, ...data } = rental;
  const docRef = doc(db, "scaffolding_rentals", id);
  await updateDoc(docRef, data);
};

export const deleteRental = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "scaffolding_rentals", id));
};

// --- Purchase Functions ---
export const getPurchases = async (): Promise<Purchase[]> => {
  const querySnapshot = await getDocs(collection(db, "scaffolding_purchases"));
  return convertSnapshot<Purchase>(querySnapshot);
};

export const addPurchase = async (purchase: Omit<Purchase, "id">): Promise<Purchase> => {
  const docRef = await addDoc(collection(db, "scaffolding_purchases"), purchase);
  return { ...purchase, id: docRef.id } as Purchase;
};

export const updatePurchase = async (purchase: Purchase): Promise<void> => {
  const { id, ...data } = purchase;
  const docRef = doc(db, "scaffolding_purchases", id);
  await updateDoc(docRef, data);
};

export const deletePurchase = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "scaffolding_purchases", id));
};
