import axiosClient from '../../../axiosinstance';

export interface State {
  id: number;
  state_name: string;
}

export interface StateResponse {
  success: boolean;
  data: State[];
}

export interface City {
  city_name: string;
}

export interface CityResponse {
  success: boolean;
  data: City[];
}

let inFlightStatesPromise: Promise<StateResponse> | null = null;
let cachedStatesRes: StateResponse | null = null;
let lastStatesFetchTime = 0;
const STATES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getStates = async (): Promise<StateResponse> => {
  const now = Date.now();
  if (inFlightStatesPromise) return inFlightStatesPromise;
  if (cachedStatesRes && now - lastStatesFetchTime < STATES_CACHE_TTL) {
    return cachedStatesRes;
  }

  inFlightStatesPromise = (async () => {
    try {
      const response = await axiosClient.get('/masters/states');
      cachedStatesRes = response.data;
      lastStatesFetchTime = Date.now();
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as StateResponse;
      }
      throw error;
    } finally {
      inFlightStatesPromise = null;
    }
  })();

  return inFlightStatesPromise;
};

const inFlightCitiesPromises = new Map<string, Promise<CityResponse>>();
const cachedCitiesMap = new Map<string, { data: CityResponse; time: number }>();
const CITIES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getCities = async (stateId?: number): Promise<CityResponse> => {
  const key = String(stateId ?? 'all');
  const now = Date.now();
  if (inFlightCitiesPromises.has(key)) {
    return inFlightCitiesPromises.get(key)!;
  }
  const cached = cachedCitiesMap.get(key);
  if (cached && now - cached.time < CITIES_CACHE_TTL) {
    return cached.data;
  }

  const promise = (async () => {
    try {
      const url = stateId ? `/masters/cities?state_id=${stateId}` : '/masters/cities';
      const response = await axiosClient.get(url);
      cachedCitiesMap.set(key, { data: response.data, time: Date.now() });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as CityResponse;
      }
      throw error;
    } finally {
      inFlightCitiesPromises.delete(key);
    }
  })();

  inFlightCitiesPromises.set(key, promise);
  return promise;
};

