import type { Room, Booking } from "./types";

export const ROOMS: Room[] = [
  { id: "R1", name: "Lecture Hall A", building: "North Wing", capacity: 120, blocked: false },
  { id: "R2", name: "Study Room 204", building: "Library",    capacity: 8,   blocked: false },
  { id: "R3", name: "Computer Lab 3", building: "Tech Block",  capacity: 30,  blocked: true  },
  { id: "R4", name: "Seminar Room 7", building: "South Wing",  capacity: 20,  blocked: false },
  { id: "R5", name: "Auditorium B",   building: "Main Hall",   capacity: 200, blocked: false },
];

export const INITIAL_BOOKINGS: Booking[] = [
  { id: "B1", roomId: "R1", start: 540,  end: 600,  title: "Intro to Algorithms" },
  { id: "B2", roomId: "R1", start: 720,  end: 840,  title: "Faculty Meeting" },
  { id: "B3", roomId: "R2", start: 480,  end: 540,  title: "Group Study" },
  { id: "B4", roomId: "R4", start: 600,  end: 690,  title: "Thesis Defense" },
  { id: "B5", roomId: "R4", start: 900,  end: 960,  title: "Workshop" },
  { id: "B6", roomId: "R5", start: 840,  end: 960,  title: "Guest Lecture" },
];
