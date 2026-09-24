import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  onValue, 
  off, 
  update, 
  remove, 
  onDisconnect 
} from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD00bmrop28lURGyA6QWNenxS9vpXUIVp0",
  authDomain: "ridesafe-a46dc.firebaseapp.com",
  databaseURL: "https://ridesafe-a46dc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ridesafe-a46dc",
  storageBucket: "ridesafe-a46dc.firebasestorage.app",
  appId: "1:345773121112:android:c73030f59b40dc8306f42d"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

/**
 * Generate memorable 6-character ride code (e.g. MOTO74, RIDE29)
 */
export function generateRideCode() {
  const prefixes = ['MOTO', 'RIDE', 'BIKE', 'CREW', 'ROAD'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${prefix}${num}`;
}

/**
 * Ensure anonymous rider ID
 */
export async function getOrCreateRiderId() {
  try {
    if (auth.currentUser) return auth.currentUser.uid;
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (err) {
    console.warn('Anonymous auth failed or offline, using persistent local ID:', err);
    let localId = localStorage.getItem('bhaiji_rider_id');
    if (!localId) {
      localId = 'rider_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('bhaiji_rider_id', localId);
    }
    return localId;
  }
}

/**
 * Create a new ride session in Firebase
 */
export async function createRide(riderName, tripInfo = null) {
  const riderId = await getOrCreateRiderId();
  const rideCode = generateRideCode();
  const sessionRef = ref(database, `rides/${rideCode}`);

  const sessionData = {
    code: rideCode,
    createdBy: riderId,
    createdAt: Date.now(),
    active: true
  };

  const initialRider = {
    id: riderId,
    name: riderName.trim(),
    lat: 0.0,
    lng: 0.0,
    speed: 0.0,
    status: 'RIDING',
    lastUpdated: Date.now()
  };

  await set(ref(database, `rides/${rideCode}/session`), sessionData);
  await set(ref(database, `rides/${rideCode}/riders/${riderId}`), initialRider);

  if (tripInfo && tripInfo.isTripPlanned) {
    await set(ref(database, `rides/${rideCode}/tripInfo`), tripInfo);
  }

  // Auto clean up / mark offline on disconnect
  const riderRef = ref(database, `rides/${rideCode}/riders/${riderId}`);
  onDisconnect(riderRef).update({
    lastUpdated: Date.now() - 70000 // marks as offline in Android isOnline check
  });

  return { rideCode, riderId };
}

/**
 * Join an existing ride session
 */
export async function joinRide(rideCode, riderName) {
  const cleanCode = rideCode.trim().toUpperCase();
  const sessionSnap = await get(ref(database, `rides/${cleanCode}/session`));
  
  if (!sessionSnap.exists() || !sessionSnap.val().active) {
    throw new Error('Ride session not found or has ended.');
  }

  const riderId = await getOrCreateRiderId();
  const riderRef = ref(database, `rides/${cleanCode}/riders/${riderId}`);

  const riderData = {
    id: riderId,
    name: riderName.trim(),
    lat: 0.0,
    lng: 0.0,
    speed: 0.0,
    status: 'RIDING',
    lastUpdated: Date.now()
  };

  await set(riderRef, riderData);

  onDisconnect(riderRef).update({
    lastUpdated: Date.now() - 70000
  });

  return { rideCode: cleanCode, riderId };
}

/**
 * Update rider location in real-time
 */
export async function updateRiderLocation(rideCode, riderId, { lat, lng, speed = 0 }) {
  if (!rideCode || !riderId) return;
  const riderRef = ref(database, `rides/${rideCode}/riders/${riderId}`);
  await update(riderRef, {
    lat,
    lng,
    speed: Math.round(speed * 10) / 10,
    lastUpdated: Date.now()
  });
}

/**
 * Update rider status (RIDING, REFUELING, PUNCTURE, REST, EMERGENCY)
 */
export async function updateRiderStatus(rideCode, riderId, status) {
  if (!rideCode || !riderId) return;
  const riderRef = ref(database, `rides/${rideCode}/riders/${riderId}`);
  await update(riderRef, {
    status,
    lastUpdated: Date.now()
  });
}

/**
 * Set or update trip route planning
 */
export async function updateTripInfo(rideCode, tripInfo) {
  if (!rideCode || !tripInfo) return;
  await set(ref(database, `rides/${rideCode}/tripInfo`), tripInfo);
}

/**
 * Listen to all riders in this ride in real-time
 */
export function subscribeToRiders(rideCode, callback) {
  const ridersRef = ref(database, `rides/${rideCode}/riders`);
  onValue(ridersRef, (snapshot) => {
    const val = snapshot.val();
    if (!val) {
      callback([]);
      return;
    }
    const ridersList = Object.keys(val).map(key => val[key]);
    callback(ridersList);
  });
  return () => off(ridersRef);
}

/**
 * Listen to trip route info
 */
export function subscribeToTripInfo(rideCode, callback) {
  const tripRef = ref(database, `rides/${rideCode}/tripInfo`);
  onValue(tripRef, (snapshot) => {
    callback(snapshot.val() || null);
  });
  return () => off(tripRef);
}

/**
 * Leave a ride session
 */
export async function leaveRide(rideCode, riderId) {
  if (!rideCode || !riderId) return;
  try {
    const riderRef = ref(database, `rides/${rideCode}/riders/${riderId}`);
    await remove(riderRef);
  } catch (err) {
    console.warn('Error removing rider on leave:', err);
  }
}

/**
 * Monitor Firebase connection state (.info/connected)
 */
export function subscribeConnectionState(callback) {
  const connectedRef = ref(database, '.info/connected');
  onValue(connectedRef, (snap) => {
    callback(Boolean(snap.val()));
  });
  return () => off(connectedRef);
}
