/**
 * SmileCare Dental Clinic — Seed / sample data (Patient Portal)
 *
 * IMPORTANT: All application data is persisted with browser localStorage.
 * localStorage is device- and browser-specific. Data will NOT automatically
 * synchronize between different devices or users. Clearing site data or using
 * a different browser/device will show a fresh (or empty) data set.
 *
 * Authentication is simulated in the frontend only and is NOT secure for real
 * patient information. Passwords are stored in plain text for demo purposes.
 */

const SmileCareData = (function () {
  const STORAGE_VERSION = 2;

  const CLINIC_INFO = {
    name: "SmileCare Dental Clinic",
    tagline: "Healthy smiles, every day",
    address: "248 Harmony Avenue, Makati City",
    phone: "+63 2 8888 4521",
    email: "hello@smilecare.demo",
    hours: "Mon–Sat · 9:00 AM – 6:00 PM",
  };

  const TIME_SLOTS = [
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "01:00 PM",
    "01:30 PM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
    "03:30 PM",
    "04:00 PM",
    "04:30 PM",
    "05:00 PM",
  ];

  /** Demo patient logins (frontend-only simulation — not secure). */
  const DEMO_ACCOUNTS = [
    { username: "juan", password: "smilecare123", patientId: "PAT-1001" },
    { username: "ana", password: "smilecare123", patientId: "PAT-1002" },
  ];

  function todayOffset(days) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function defaultServices() {
    return [
      {
        id: "SRV-001",
        name: "Dental Cleaning",
        description: "Professional prophylaxis to remove plaque and tartar for healthier gums.",
        price: 1500,
      },
      {
        id: "SRV-002",
        name: "Tooth Extraction",
        description: "Safe removal of damaged or overcrowded teeth under local anesthesia.",
        price: 2500,
      },
      {
        id: "SRV-003",
        name: "Tooth Filling",
        description: "Composite or amalgam restoration for cavities and minor fractures.",
        price: 1800,
      },
      {
        id: "SRV-004",
        name: "Teeth Whitening",
        description: "In-clinic whitening treatment for a brighter, more confident smile.",
        price: 4500,
      },
      {
        id: "SRV-005",
        name: "Dental Consultation",
        description: "Comprehensive oral exam with personalized treatment recommendations.",
        price: 800,
      },
      {
        id: "SRV-006",
        name: "Root Canal Treatment",
        description: "Endodontic therapy to save infected teeth and relieve pain.",
        price: 8500,
      },
    ];
  }

  function defaultPatients() {
    return [
      {
        id: "PAT-1001",
        username: "juan",
        password: "smilecare123",
        fullName: "Juan Dela Cruz",
        age: 34,
        gender: "Male",
        contact: "+63 918 222 1101",
        email: "juan.delacruz@email.com",
        address: "12 Mabini St, Quezon City",
      },
      {
        id: "PAT-1002",
        username: "ana",
        password: "smilecare123",
        fullName: "Ana Reyes",
        age: 28,
        gender: "Female",
        contact: "+63 919 333 2202",
        email: "ana.reyes@email.com",
        address: "88 Ortigas Ave, Pasig City",
      },
      {
        id: "PAT-1003",
        username: "carlo",
        password: "smilecare123",
        fullName: "Carlo Mendoza",
        age: 41,
        gender: "Male",
        contact: "+63 920 444 3303",
        email: "carlo.m@email.com",
        address: "5th Ave, Bonifacio Global City",
      },
      {
        id: "PAT-1004",
        username: "sofia",
        password: "smilecare123",
        fullName: "Sofia Lim",
        age: 22,
        gender: "Female",
        contact: "+63 917 555 4404",
        email: "sofia.lim@email.com",
        address: "Unit 7B, Greenbelt Residences, Makati",
      },
      {
        id: "PAT-1005",
        username: "miguel",
        password: "smilecare123",
        fullName: "Miguel Torres",
        age: 55,
        gender: "Male",
        contact: "+63 916 666 5505",
        email: "miguel.torres@email.com",
        address: "45 Rizal Blvd, Manila",
      },
      {
        id: "PAT-1006",
        username: "elena",
        password: "smilecare123",
        fullName: "Elena Garcia",
        age: 31,
        gender: "Female",
        contact: "+63 915 777 6606",
        email: "elena.g@email.com",
        address: "21 Luna St, Mandaluyong",
      },
    ];
  }

  function defaultAppointments() {
    return [
      {
        id: "APT-2001",
        patientName: "Juan Dela Cruz",
        contact: "+63 918 222 1101",
        patientId: "PAT-1001",
        service: "Dental Cleaning",
        date: todayOffset(0),
        time: "09:00 AM",
        status: "Confirmed",
        remarks: "Regular 6-month cleaning.",
        updatedAt: Date.now() - 1000 * 60 * 40,
      },
      {
        id: "APT-2002",
        patientName: "Ana Reyes",
        contact: "+63 919 333 2202",
        patientId: "PAT-1002",
        service: "Teeth Whitening",
        date: todayOffset(0),
        time: "10:30 AM",
        status: "Pending",
        remarks: "First whitening session.",
        updatedAt: Date.now() - 1000 * 60 * 25,
      },
      {
        id: "APT-2003",
        patientName: "Carlo Mendoza",
        contact: "+63 920 444 3303",
        patientId: "PAT-1003",
        service: "Tooth Filling",
        date: todayOffset(0),
        time: "02:00 PM",
        status: "Confirmed",
        remarks: "Upper left molar sensitivity.",
        updatedAt: Date.now() - 1000 * 60 * 90,
      },
      {
        id: "APT-2004",
        patientName: "Sofia Lim",
        contact: "+63 917 555 4404",
        patientId: "PAT-1004",
        service: "Dental Consultation",
        date: todayOffset(1),
        time: "11:00 AM",
        status: "Pending",
        remarks: "New patient checkup.",
        updatedAt: Date.now() - 1000 * 60 * 120,
      },
      {
        id: "APT-2005",
        patientName: "Miguel Torres",
        contact: "+63 916 666 5505",
        patientId: "PAT-1005",
        service: "Root Canal Treatment",
        date: todayOffset(2),
        time: "01:30 PM",
        status: "Confirmed",
        remarks: "Follow-up canal treatment.",
        updatedAt: Date.now() - 1000 * 60 * 200,
      },
      {
        id: "APT-2006",
        patientName: "Elena Garcia",
        contact: "+63 915 777 6606",
        patientId: "PAT-1006",
        service: "Tooth Extraction",
        date: todayOffset(-1),
        time: "03:00 PM",
        status: "Completed",
        remarks: "Wisdom tooth removal — recovered well.",
        updatedAt: Date.now() - 1000 * 60 * 60 * 20,
      },
      {
        id: "APT-2007",
        patientName: "Juan Dela Cruz",
        contact: "+63 918 222 1101",
        patientId: "PAT-1001",
        service: "Dental Consultation",
        date: todayOffset(-3),
        time: "09:30 AM",
        status: "Completed",
        remarks: "Pre-cleaning assessment.",
        updatedAt: Date.now() - 1000 * 60 * 60 * 72,
      },
      {
        id: "APT-2008",
        patientName: "Ana Reyes",
        contact: "+63 919 333 2202",
        patientId: "PAT-1002",
        service: "Dental Cleaning",
        date: todayOffset(-5),
        time: "04:00 PM",
        status: "Cancelled",
        remarks: "Patient rescheduled due to travel.",
        updatedAt: Date.now() - 1000 * 60 * 60 * 96,
      },
      {
        id: "APT-2009",
        patientName: "Juan Dela Cruz",
        contact: "+63 918 222 1101",
        patientId: "PAT-1001",
        service: "Tooth Filling",
        date: todayOffset(3),
        time: "03:00 PM",
        status: "Pending",
        remarks: "Follow-up filling.",
        updatedAt: Date.now() - 1000 * 60 * 15,
      },
    ];
  }

  function defaultPreferences() {
    return {
      compact: false,
      confirmDelete: true,
    };
  }

  function createSeedState() {
    return {
      version: STORAGE_VERSION,
      services: defaultServices(),
      patients: defaultPatients(),
      appointments: defaultAppointments(),
      preferences: defaultPreferences(),
      counters: {
        patient: 1006,
        appointment: 2009,
        service: 6,
      },
    };
  }

  return {
    STORAGE_VERSION,
    CLINIC_INFO,
    TIME_SLOTS,
    DEMO_ACCOUNTS,
    createSeedState,
    defaultServices,
    defaultPatients,
    defaultAppointments,
    defaultPreferences,
  };
})();
