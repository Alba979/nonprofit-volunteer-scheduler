/* eslint-disable no-console */
import { PrismaClient, BackgroundCheckStatus, BookingStatus, AttendanceStatus, Role, SmsType, SmsStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(days: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding VolunteerShield database with realistic sample data...");

  // ---- Reset (dev only) -----------------------------------------------
  await prisma.smsMessage.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.shiftBooking.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.backgroundCheck.deleteMany();
  await prisma.volunteer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.programArea.deleteMany();

  // ---- Program areas ----------------------------------------------------
  const [foodPantry, youthMentoring, seniorCompanion, animalShelter, disasterRelief] = await Promise.all([
    prisma.programArea.create({
      data: { name: "Food Pantry", description: "Weekly food distribution and pantry stocking." },
    }),
    prisma.programArea.create({
      data: { name: "Youth Mentoring", description: "One-on-one and group mentoring for ages 8–17. Requires background check." },
    }),
    prisma.programArea.create({
      data: { name: "Senior Companionship", description: "In-home visits and check-ins with elderly clients. Requires background check." },
    }),
    prisma.programArea.create({
      data: { name: "Animal Shelter", description: "Intake support, dog walking, and adoption events." },
    }),
    prisma.programArea.create({
      data: { name: "Disaster Relief", description: "Emergency response staging and supply logistics." },
    }),
  ]);

  // ---- Admin & coordinator accounts -------------------------------------
  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  await prisma.user.create({
    data: { email: "admin@riversideoutreach.org", passwordHash: adminPasswordHash, role: Role.ADMIN },
  });
  await prisma.user.create({
    data: { email: "coordinator@riversideoutreach.org", passwordHash: adminPasswordHash, role: Role.COORDINATOR },
  });

  // ---- Volunteers ---------------------------------------------------------
  const volunteerSeed = [
    { firstName: "Maria", lastName: "Gonzalez", email: "maria.gonzalez@example.com", phone: "+15035550101", area: youthMentoring },
    { firstName: "James", lastName: "Whitfield", email: "james.whitfield@example.com", phone: "+15035550102", area: seniorCompanion },
    { firstName: "Aisha", lastName: "Bello", email: "aisha.bello@example.com", phone: "+15035550103", area: foodPantry },
    { firstName: "Daniel", lastName: "Kim", email: "daniel.kim@example.com", phone: "+15035550104", area: animalShelter },
    { firstName: "Priya", lastName: "Natarajan", email: "priya.natarajan@example.com", phone: "+15035550105", area: youthMentoring },
    { firstName: "Robert", lastName: "Alvarez", email: "robert.alvarez@example.com", phone: "+15035550106", area: disasterRelief },
    { firstName: "Grace", lastName: "O'Sullivan", email: "grace.osullivan@example.com", phone: "+15035550107", area: seniorCompanion },
    { firstName: "Marcus", lastName: "Lee", email: "marcus.lee@example.com", phone: "+15035550108", area: foodPantry },
    { firstName: "Fatima", lastName: "Hassan", email: "fatima.hassan@example.com", phone: "+15035550109", area: youthMentoring },
    { firstName: "Tyler", lastName: "Brooks", email: "tyler.brooks@example.com", phone: "+15035550110", area: animalShelter },
    { firstName: "Elena", lastName: "Petrova", email: "elena.petrova@example.com", phone: "+15035550111", area: seniorCompanion },
    { firstName: "Samuel", lastName: "Osei", email: "samuel.osei@example.com", phone: "+15035550112", area: disasterRelief },
    { firstName: "Nora", lastName: "Chen", email: "nora.chen@example.com", phone: "+15035550113", area: foodPantry },
    { firstName: "Isaac", lastName: "Reyes", email: "isaac.reyes@example.com", phone: "+15035550114", area: youthMentoring },
    { firstName: "Hannah", lastName: "Fitzgerald", email: "hannah.fitzgerald@example.com", phone: "+15035550115", area: animalShelter },
    { firstName: "Omar", lastName: "Idris", email: "omar.idris@example.com", phone: "+15035550116", area: seniorCompanion },
    { firstName: "Lucia", lastName: "Moreno", email: "lucia.moreno@example.com", phone: "+15035550117", area: foodPantry },
    { firstName: "Ben", lastName: "Carter", email: "ben.carter@example.com", phone: "+15035550118", area: disasterRelief },
    { firstName: "Sofia", lastName: "Rinaldi", email: "sofia.rinaldi@example.com", phone: "+15035550119", area: youthMentoring },
    { firstName: "Wei", lastName: "Zhang", email: "wei.zhang@example.com", phone: "+15035550120", area: animalShelter },
  ];

  const volunteers = [];
  for (const v of volunteerSeed) {
    const passwordHash = await bcrypt.hash("Volunteer123!", 10);
    const user = await prisma.user.create({
      data: { email: v.email, passwordHash, role: Role.VOLUNTEER },
    });
    const volunteer = await prisma.volunteer.create({
      data: {
        userId: user.id,
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone,
        programAreaId: v.area.id,
        joinedAt: daysFromNow(-Math.floor(Math.random() * 300 + 30)),
      },
    });
    volunteers.push(volunteer);
  }

  // ---- Background checks ---------------------------------------------
  // Restricted program areas: Youth Mentoring, Senior Companionship.
  const restrictedAreaIds = new Set([youthMentoring.id, seniorCompanion.id]);
  for (const volunteer of volunteers) {
    if (!restrictedAreaIds.has(volunteer.programAreaId!)) continue;

    // Distribute realistic clearance states across restricted volunteers:
    // most cleared & current, one expired, one pending, one rejected.
    const idx = volunteers.indexOf(volunteer);
    if (idx % 7 === 0) {
      // Expired
      await prisma.backgroundCheck.create({
        data: {
          volunteerId: volunteer.id,
          provider: "Checkr",
          referenceNumber: `BGC-${1000 + idx}`,
          status: BackgroundCheckStatus.EXPIRED,
          issuedAt: daysFromNow(-400),
          expiresAt: daysFromNow(-35),
        },
      });
    } else if (idx % 11 === 0) {
      // Pending — never cleared yet
      await prisma.backgroundCheck.create({
        data: {
          volunteerId: volunteer.id,
          provider: "State Registry",
          referenceNumber: `BGC-${1000 + idx}`,
          status: BackgroundCheckStatus.PENDING,
        },
      });
    } else {
      // Cleared, current (expires in the future)
      await prisma.backgroundCheck.create({
        data: {
          volunteerId: volunteer.id,
          provider: "Checkr",
          referenceNumber: `BGC-${1000 + idx}`,
          status: BackgroundCheckStatus.CLEARED,
          issuedAt: daysFromNow(-200),
          expiresAt: daysFromNow(idx % 3 === 0 ? 25 : 300), // a couple expiring soon
        },
      });
    }
  }

  // ---- Shifts: past 60 days + upcoming 21 days --------------------------
  const programAreas = [foodPantry, youthMentoring, seniorCompanion, animalShelter, disasterRelief];
  const locations: Record<string, string> = {
    [foodPantry.id]: "Riverside Community Pantry, 214 Elm St",
    [youthMentoring.id]: "Riverside Youth Center, 88 Maple Ave",
    [seniorCompanion.id]: "Client home visits (Riverside metro)",
    [animalShelter.id]: "Riverside Animal Shelter, 500 Harbor Rd",
    [disasterRelief.id]: "Regional Logistics Warehouse, 12 Dock St",
  };
  const titles: Record<string, string[]> = {
    [foodPantry.id]: ["Pantry Stocking Shift", "Distribution Line Support", "Food Sort & Pack"],
    [youthMentoring.id]: ["1-on-1 Mentoring Session", "After-School Group Mentoring", "Weekend Youth Workshop"],
    [seniorCompanion.id]: ["Home Visit — Companionship", "Grocery Run for Client", "Wellness Check-In"],
    [animalShelter.id]: ["Dog Walking Shift", "Shelter Intake Support", "Adoption Event Staffing"],
    [disasterRelief.id]: ["Supply Kit Assembly", "Warehouse Inventory Shift", "Response Staging Drill"],
  };

  const shifts = [];
  // Past shifts (for attendance history / retention / no-show data)
  for (let dayOffset = -60; dayOffset < 0; dayOffset += 3) {
    for (const area of programAreas) {
      const shift = await prisma.shift.create({
        data: {
          title: titles[area.id][Math.floor(Math.random() * titles[area.id].length)],
          description: `Scheduled ${area.name.toLowerCase()} shift.`,
          programAreaId: area.id,
          location: locations[area.id],
          startTime: daysFromNow(dayOffset, 9 + (dayOffset % 3)),
          endTime: daysFromNow(dayOffset, 12 + (dayOffset % 3)),
          capacity: 3,
          requiresBackgroundCheck: restrictedAreaIds.has(area.id),
          reminderSentAt: daysFromNow(dayOffset - 1),
        },
      });
      shifts.push(shift);
    }
  }
  // Upcoming shifts (bookable in the demo UI)
  for (let dayOffset = 1; dayOffset <= 21; dayOffset += 2) {
    for (const area of programAreas) {
      const shift = await prisma.shift.create({
        data: {
          title: titles[area.id][Math.floor(Math.random() * titles[area.id].length)],
          description: `Scheduled ${area.name.toLowerCase()} shift.`,
          programAreaId: area.id,
          location: locations[area.id],
          startTime: daysFromNow(dayOffset, 9 + (dayOffset % 3)),
          endTime: daysFromNow(dayOffset, 12 + (dayOffset % 3)),
          capacity: 3,
          requiresBackgroundCheck: restrictedAreaIds.has(area.id),
        },
      });
      shifts.push(shift);
    }
  }

  // ---- Bookings + attendance logs for PAST shifts -----------------------
  const pastShifts = shifts.filter((s) => s.startTime.getTime() < Date.now());
  for (const shift of pastShifts) {
    const areaVolunteers = volunteers.filter((v) => v.programAreaId === shift.programAreaId);
    const attendees = areaVolunteers.sort(() => 0.5 - Math.random()).slice(0, Math.min(3, areaVolunteers.length));

    for (const volunteer of attendees) {
      const roll = Math.random();
      let bookingStatus: BookingStatus = BookingStatus.CONFIRMED;
      let attendanceStatus: AttendanceStatus = AttendanceStatus.ATTENDED;
      let isLastMinute = false;

      if (roll < 0.12) {
        bookingStatus = BookingStatus.CANCELLED;
        attendanceStatus = AttendanceStatus.EXCUSED;
        isLastMinute = Math.random() < 0.5;
      } else if (roll < 0.22) {
        attendanceStatus = AttendanceStatus.NO_SHOW;
      }

      const booking = await prisma.shiftBooking.create({
        data: {
          shiftId: shift.id,
          volunteerId: volunteer.id,
          status: bookingStatus,
          bookedAt: new Date(shift.startTime.getTime() - 5 * 24 * 60 * 60 * 1000),
          cancelledAt: bookingStatus === BookingStatus.CANCELLED ? new Date(shift.startTime.getTime() - 12 * 60 * 60 * 1000) : null,
          cancelReason: bookingStatus === BookingStatus.CANCELLED ? "Scheduling conflict" : null,
          isLastMinute,
        },
      });

      const area = programAreas.find((a) => a.id === shift.programAreaId)!;
      let snapshot = "NOT_REQUIRED";
      if (restrictedAreaIds.has(area.id)) {
        const check = await prisma.backgroundCheck.findFirst({
          where: { volunteerId: volunteer.id },
          orderBy: { requestedAt: "desc" },
        });
        if (check?.status === "CLEARED" && check.expiresAt && check.expiresAt > shift.startTime) {
          snapshot = `CLEARED (exp. ${check.expiresAt.toISOString().slice(0, 10)})`;
        } else {
          snapshot = `NOT_CLEARED (${check?.status ?? "no check on file"})`;
        }
      }

      await prisma.attendanceLog.create({
        data: {
          shiftBookingId: booking.id,
          volunteerId: volunteer.id,
          status: attendanceStatus,
          clearanceStatusAtShift: snapshot,
          programAreaName: area.name,
          shiftStartTime: shift.startTime,
          loggedBy: "coordinator@riversideoutreach.org",
        },
      });

      if (isLastMinute) {
        await prisma.smsMessage.create({
          data: {
            volunteerId: volunteer.id,
            type: SmsType.CANCELLATION_CONFIRMATION,
            body: `Hi ${volunteer.firstName}, we've recorded your cancellation for "${shift.title}". Thanks for letting us know — we're reaching out to find a replacement.`,
            status: SmsStatus.SIMULATED,
          },
        });
      }
    }
  }

  // ---- A handful of upcoming, already-confirmed bookings -----------------
  const upcomingShifts = shifts.filter((s) => s.startTime.getTime() > Date.now()).slice(0, 15);
  for (const shift of upcomingShifts) {
    const areaVolunteers = volunteers.filter((v) => v.programAreaId === shift.programAreaId);
    const [volunteer] = areaVolunteers.sort(() => 0.5 - Math.random());
    if (!volunteer) continue;

    if (shift.requiresBackgroundCheck) {
      const check = await prisma.backgroundCheck.findFirst({
        where: { volunteerId: volunteer.id },
        orderBy: { requestedAt: "desc" },
      });
      const cleared = check?.status === "CLEARED" && check.expiresAt && check.expiresAt > new Date();
      if (!cleared) continue; // skip pre-booking volunteers who wouldn't actually clear
    }

    await prisma.shiftBooking.create({
      data: { shiftId: shift.id, volunteerId: volunteer.id, status: BookingStatus.CONFIRMED },
    });
  }

  console.log(`Seed complete: ${volunteers.length} volunteers, ${shifts.length} shifts across ${programAreas.length} program areas.`);
  console.log("Login as admin: admin@riversideoutreach.org / Admin123!");
  console.log("Login as coordinator: coordinator@riversideoutreach.org / Admin123!");
  console.log("Any volunteer email / Volunteer123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
