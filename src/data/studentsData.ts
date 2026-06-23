import { StudentRecord } from "../types";

export const SEED_STUDENTS: StudentRecord[] = [
  // --- CLASS 11A STUDENTS ---
  {
    fullName: "Aahana Sharma",
    firstName: "Aahana",
    lastName: "Sharma",
    classSection: "11A",
    rollNumber: "1",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Missing elective subject choices in XLSX combinations sheet",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class List - Orientation.docx", "Class_List_11A_2026-27.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '1 Aahana Sharma - - - -'",
      "Class List - Orientation.docx: '1 Aahana Sharma'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Aakash Kumar",
    firstName: "Aakash",
    lastName: "Kumar",
    classSection: "11A",
    rollNumber: "2",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Missing elective subject choices in XLSX combinations sheet",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class List - Orientation.docx", "Class_List_11A_2026-27.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '2 Aakash Kumar - - - -'",
      "Class List - Orientation.docx: '2 Aakash Kumar'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Aaradhita Arya",
    firstName: "Aaradhita",
    lastName: "Arya",
    classSection: "11A",
    rollNumber: "3",
    admissionNumber: "118800",
    subjects: ["Physics", "Chemistry", "Pure Mathematics", "Biology"],
    subjectCombination: "Physics, Chemistry, Pure Mathematics, Biology",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '3 Aaradhita Arya Physics Chemistry Pure Mathematics Biology'",
      "Class 11ABC Choices: '118800 Aaradhita Arya CL11A_HROOM: Thaosen Elective 1: Physics Elective 2: Chemistry Elective 3: Pure Mathematics Elective 4: Biology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Aarit Malhotra",
    firstName: "Aarit",
    lastName: "Malhotra",
    classSection: "11A",
    rollNumber: "4",
    admissionNumber: "119575",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Missing elective subject choices in XLSX combinations sheet",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '4 Aarit Malhotra - - - -'",
      "Class 11ABC Choices: '119575 Aarit Malhotra CL11A_HROOM: Thaosen'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Abhay Talwar",
    firstName: "Abhay",
    lastName: "Talwar",
    classSection: "11A",
    rollNumber: "5",
    admissionNumber: "119576",
    subjects: ["Economics", "Political Science", "Pure Mathematics", "Entrepreneurship"],
    subjectCombination: "Economics, Political Science, Pure Mathematics, Entrepreneurship",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '5 Abhay Talwar Economics Political Science Pure Mathematics Entrepreneurship'",
      "Class 11ABC Choices: '119576 Abhay Talwar CL11A_HROOM: Thaosen Elective 1: Economics Elective 2: Political Science Elective 3: Pure Mathematics Elective 4: Entrepreneurship'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Adya Tewari",
    firstName: "Adya",
    lastName: "Tewari",
    classSection: "11A",
    rollNumber: "6",
    admissionNumber: "103020",
    subjects: ["Physics", "Chemistry", "Pure Mathematics", "Entrepreneurship"],
    subjectCombination: "Physics, Chemistry, Pure Mathematics, Entrepreneurship",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '6 Adya Tewari Physics Chemistry Pure Mathematics Entrepreneurship'",
      "Class 11ABC Choices: '103020 Adya Tewari CL11A_HROOM: Thaosen Elective 1: Physics Elective 2: Chemistry Elective 3: Pure Mathematics Elective 4: Entrepreneurship'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Ahana Agarwal",
    firstName: "Ahana",
    lastName: "Agarwal",
    classSection: "11A",
    rollNumber: "7",
    admissionNumber: "119162",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Missing elective subject choices in XLSX combinations sheet",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '7 Ahana Agarwal - - - -'",
      "Class 11ABC Choices: '119162 Ahana Agarwal CL11A_HROOM: Thaosen'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Alishba Rehman",
    firstName: "Alishba",
    lastName: "Rehman",
    classSection: "11A",
    rollNumber: "8",
    admissionNumber: "102957",
    subjects: ["History", "Applied Art", "Sociology", "Psychology"],
    subjectCombination: "History, Applied Art, Sociology, Psychology",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '8 Alishba Rehman History Applied Art Sociology Psychology'",
      "E3 Sociology Students: '1 Alishba Rehman 11A History Applied Art Sociology Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Alysha Sinha",
    firstName: "Alysha",
    lastName: "Sinha",
    classSection: "11A",
    rollNumber: "9",
    admissionNumber: "102995",
    subjects: ["Business Studies", "Psychology", "Pure Mathematics", "Economics"],
    subjectCombination: "Business Studies, Psychology, Pure Mathematics, Economics",
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Name variation: 'Alysha -' in Orientation docx vs 'Alysha Sinha' in spreadsheet and choices",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '9 Alysha Sinha Business Studies Psychology Pure Mathematics Economics'",
      "Class List - Orientation.docx: '9 Alysha -'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Amaira Chopra",
    firstName: "Amaira",
    lastName: "Chopra",
    classSection: "11A",
    rollNumber: "10",
    admissionNumber: "102935",
    subjects: ["Business Studies", "Political Science", "Sociology", "Economics"],
    subjectCombination: "Business Studies, Political Science, Sociology, Economics",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '10 Amaira Chopra Business Studies Political Science Sociology Economics'",
      "E3 Sociology Students: '2 Amaira Chopra 11A Business Studies Political Science Sociology Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Anahita Rene Ganeshan",
    firstName: "Anahita",
    lastName: "Ganeshan",
    classSection: "11A",
    rollNumber: "11",
    admissionNumber: "102997",
    subjects: ["Sociology", "Political Science", "Pure Mathematics", "Economics"],
    subjectCombination: "Sociology, Political Science, Pure Mathematics, Economics",
    sociologyStudent: true,
    confidence: "high",
    needsReview: true,
    reviewReason: "Name variation: 'Anahita Ganeshan' in Orientation docx vs 'Anahita Rene Ganeshan' in spreadsheet",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '11 Anahita Rene Ganeshan Sociology Political Science Pure Mathematics Economics'",
      "Class List - Orientation.docx: '11 Anahita Ganeshan'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Angad Sikka",
    firstName: "Angad",
    lastName: "Sikka",
    classSection: "11A",
    rollNumber: "12",
    admissionNumber: "102941",
    subjects: ["Economics", "Computer Science", "Pure Mathematics", "Psychology"],
    subjectCombination: "Economics, Computer Science, Pure Mathematics, Psychology",
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Critical Mismatch: Orientation registers 'Angad Kakkar' at roll #12, but subject sheet lists 'Angad Sikka'",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '12 Angad Sikka Economics Computer Science Pure Mathematics Psychology'",
      "Class List - Orientation.docx: '12 Angad Kakkar'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Angad Singh Kakar",
    firstName: "Angad",
    lastName: "Kakar",
    classSection: "11A",
    rollNumber: "13",
    admissionNumber: "102968",
    subjects: ["Physics", "Computer Science", "Pure Mathematics", "Economics"],
    subjectCombination: "Physics, Computer Science, Pure Mathematics, Economics",
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Spelling variation: 'Angad Sikka' at roll #13 in Orientation vs 'Angad Singh Kakar' in subject choices",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '13 Angad Singh Kakar Physics Computer Science Pure Mathematics Economics'",
      "Class List - Orientation.docx: '13 Angad Sikka'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Anhad Kashyap",
    firstName: "Anhad",
    lastName: "Kashyap",
    classSection: "11A",
    rollNumber: "14",
    admissionNumber: "102945",
    subjects: ["Physics", "Computer Science", "Pure Mathematics", "Economics"],
    subjectCombination: "Physics, Computer Science, Pure Mathematics, Economics",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '14 Anhad Kashyap Physics Computer Science Pure Mathematics Economics'",
      "Class 11ABC Choices: '102945 Anhad Kashyap CL11A_HROOM: Thaosen Elective 1: Physics Elective 2: Computer Science Elective 3: Pure Mathematics Elective 4: Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Arjun Jain",
    firstName: "Arjun",
    lastName: "Jain",
    classSection: "11A",
    rollNumber: "15",
    admissionNumber: "102970",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Missing elective subject choices in XLSX combinations sheet",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class List - Orientation.docx", "Class_List_11A_2026-27.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '15 Arjun Jain - - - -'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Armaan Kohli",
    firstName: "Armaan",
    lastName: "Kohli",
    classSection: "11A",
    rollNumber: "16",
    admissionNumber: "102958",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Missing elective subject choices in XLSX combinations sheet",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class List - Orientation.docx", "Class_List_11A_2026-27.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '16 Armaan Kohli - - - -'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Aryan Yadav",
    firstName: "Aryan",
    lastName: "Yadav",
    classSection: "11A",
    rollNumber: "17",
    admissionNumber: "103001",
    subjects: ["Business Studies", "Accountancy", "Pure Mathematics", "Entrepreneurship"],
    subjectCombination: "Business Studies, Accountancy, Pure Mathematics, Entrepreneurship",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '17 Aryan Yadav Business Studies Accountancy Pure Mathematics Entrepreneurship'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Ayaan Narang",
    firstName: "Ayaan",
    lastName: "Narang",
    classSection: "11A",
    rollNumber: "18",
    admissionNumber: "120701",
    subjects: ["Physics", "Chemistry", "Pure Mathematics", "Computer Science"],
    subjectCombination: "Physics, Chemistry, Pure Mathematics, Computer Science",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '18 Ayaan Narang Physics Chemistry Pure Mathematics Computer Science'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Chetanya Kumar Love",
    firstName: "Chetanya",
    lastName: "Love",
    classSection: "11A",
    rollNumber: "19",
    admissionNumber: "102978",
    subjects: ["Business Studies", "Accountancy", "Web Applications", "Entrepreneurship"],
    subjectCombination: "Business Studies, Accountancy, Web Applications, Entrepreneurship",
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Minor middle name spelling variation: 'Chetanya Love' in Orientation docx vs 'Chetanya Kumar Love' in spreadsheets",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '19 Chetanya Kumar Love Business Studies Accountancy Web Applications Entrepreneurship'",
      "Class List - Orientation.docx: '19 Chetanya Love'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Darsh Goel",
    firstName: "Darsh",
    lastName: "Goel",
    classSection: "11A",
    rollNumber: "20",
    admissionNumber: "119581",
    subjects: ["Physics", "Computer Science", "Pure Mathematics", "Economics"],
    subjectCombination: "Physics, Computer Science, Pure Mathematics, Economics",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '20 Darsh Goel Physics Computer Science Pure Mathematics Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Gaayantika Chander",
    firstName: "Gaayantika",
    lastName: "Chander",
    classSection: "11A",
    rollNumber: "21",
    admissionNumber: "119585",
    subjects: ["Economics", "Accountancy", "Pure Mathematics", "Computer Science"],
    subjectCombination: "Economics, Accountancy, Pure Mathematics, Computer Science",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '21 Gaayantika Chander Economics Accountancy Pure Mathematics Computer Science'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Khushi Goel",
    firstName: "Khushi",
    lastName: "Goel",
    classSection: "11A",
    rollNumber: "22",
    admissionNumber: "120711",
    subjects: ["Business Studies", "Accountancy", "Pure Mathematics", "Economics"],
    subjectCombination: "Business Studies, Accountancy, Pure Mathematics, Economics",
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Name variation: 'Khushi Goel' in subject combinations vs 'Goel, Khushi' / 'Khushi Goel' in choices",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '22 Khushi Goel Business Studies Accountancy Pure Mathematics Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Leela Varma",
    firstName: "Leela",
    lastName: "Varma",
    classSection: "11A",
    rollNumber: "23",
    admissionNumber: "102936",
    subjects: ["Business Studies", "Home Science", "Physical Education", "Psychology"],
    subjectCombination: "Business Studies, Home Science, Physical Education, Psychology",
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Spelling variation: 'Leela Varma' in subject combinations vs 'Varma, Leela' in Sheet4",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '23 Leela Varma Business Studies Home Science Physical Education Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "MD Arshad Ansari",
    firstName: "MD Arshad",
    lastName: "Ansari",
    classSection: "11A",
    rollNumber: "24",
    admissionNumber: "102985",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Missing elective subject choices in XLSX combinations sheet",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class List - Orientation.docx", "Class_List_11A_2026-27.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '24 MD Arshad Ansari - - - -'",
      "Class List - Orientation.docx: '25 Md Arshad Ansari'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Mahi -",
    firstName: "Mahi",
    lastName: "Mahi",
    classSection: "11A",
    rollNumber: "25",
    admissionNumber: "102976",
    subjects: ["Business Studies", "Home Science", "Sociology", "Psychology"],
    subjectCombination: "Business Studies, Home Science, Sociology, Psychology",
    sociologyStudent: true,
    confidence: "high",
    needsReview: true,
    reviewReason: "Name formatting: has trailing hyphen in spreadsheets ('Mahi -') but just 'Mahi' in orientation texts.",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '25 Mahi - Business Studies Home Science Sociology Psychology'",
      "E3 Sociology Students: '3 Mahi - 11A Business Studies Home Science Sociology Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Mitansh Khatri",
    firstName: "Mitansh",
    lastName: "Khatri",
    classSection: "11A",
    rollNumber: "26",
    admissionNumber: "102974",
    subjects: ["Business Studies", "Accountancy", "Pure Mathematics", "Economics"],
    subjectCombination: "Business Studies, Accountancy, Pure Mathematics, Economics",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '26 Mitansh Khatri Business Studies Accountancy Pure Mathematics Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Muskan Khatoon",
    firstName: "Muskan",
    lastName: "Khatoon",
    classSection: "11A",
    rollNumber: "27",
    admissionNumber: "102975",
    subjects: ["Sociology", "Political Science", "Applied Art", "Psychology"],
    subjectCombination: "Sociology, Political Science, Applied Art, Psychology",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '27 Muskan Khatoon Sociology Political Science Applied Art Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Omyra Lakhanpal",
    firstName: "Omyra",
    lastName: "Lakhanpal",
    classSection: "11A",
    rollNumber: "28",
    admissionNumber: "118450",
    subjects: ["Sociology", "Computer Science", "Pure Mathematics", "Economics"],
    subjectCombination: "Sociology, Computer Science, Pure Mathematics, Economics",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '28 Omyra Lakhanpal Sociology Computer Science Pure Mathematics Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Samridh Malik",
    firstName: "Samridh",
    lastName: "Malik",
    classSection: "11A",
    rollNumber: "29",
    admissionNumber: "103015",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Missing elective subject choices in XLSX combinations sheet",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class List - Orientation.docx", "Class_List_11A_2026-27.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '29 Samridh Malik - - - -'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Sanskriti Sharma",
    firstName: "Sanskriti",
    lastName: "Sharma",
    classSection: "11A",
    rollNumber: "30",
    admissionNumber: "102992",
    subjects: ["Business Studies", "Home Science", "Sociology", "Psychology"],
    subjectCombination: "Business Studies, Home Science, Sociology, Psychology",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '30 Sanskriti Sharma Business Studies Home Science Sociology Psychology'",
      "E3 Sociology Students: '4 Sanskriti Sharma 11A Business Studies Home Science Sociology Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Shaurya Chopra",
    firstName: "Shaurya",
    lastName: "Chopra",
    classSection: "11A",
    rollNumber: "31",
    admissionNumber: "102950",
    subjects: ["Business Studies", "Accountancy", "Sociology", "Economics"],
    subjectCombination: "Business Studies, Accountancy, Sociology, Economics",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '31 Shaurya Chopra Business Studies Accountancy Sociology Economics'",
      "E3 Sociology Students: '5 Shaurya Chopra 11A Business Studies Accountancy Sociology Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Sofiya -",
    firstName: "Sofiya",
    lastName: "Sofiya",
    classSection: "11A",
    rollNumber: "32",
    admissionNumber: "102989",
    subjects: ["Sociology", "Applied Art", "Physical Education", "Economics"],
    subjectCombination: "Sociology, Applied Art, Physical Education, Economics",
    sociologyStudent: true,
    confidence: "high",
    needsReview: true,
    reviewReason: "Name formatting: has trailing hyphen in spreadsheets ('Sofiya -') but just 'Sofiya' in orientation documents",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '32 Sofiya - Sociology Applied Art Physical Education Economics'",
      "Class List - Orientation.docx: '32 Sofiya'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Veer Jain",
    firstName: "Veer",
    lastName: "Jain",
    classSection: "11A",
    rollNumber: "33",
    admissionNumber: "120615",
    subjects: ["Economics", "Political Science", "Sociology", "Psychology"],
    subjectCombination: "Economics, Political Science, Sociology, Psychology",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx", "Class List - Orientation.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '33 Veer Jain Economics Political Science Sociology Psychology'",
      "E3 Sociology Students: '6 Veer Jain 11A Economics Political Science Sociology Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Yash Choudhary",
    firstName: "Yash",
    lastName: "Choudhary",
    classSection: "11A",
    rollNumber: "34",
    admissionNumber: "102947",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "Missing elective subject choices in XLSX combinations sheet",
    sourceFiles: ["11A Subject Combinations 2026-27.xlsx", "Class List - Orientation.docx", "Class_List_11A_2026-27.docx"],
    sourceEvidence: [
      "11A Subject Combinations: '34 Yash Choudhary - - - -'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // --- CLASS 11B & 11C STUDENTS (OTHER 11ABC RECORDS) ---
  {
    fullName: "Aarav Gupta",
    firstName: "Aarav",
    lastName: "Gupta",
    classSection: "11B",
    admissionNumber: "119574",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "No elective subject allocation present in the 11ABC source dataset",
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx"],
    sourceEvidence: ["Class 11ABC: '102961 Divit Chhabra Class 11 CL11B_HROOM: Kaushik'"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Divit Chhabra",
    firstName: "Divit",
    lastName: "Chhabra",
    classSection: "11B",
    admissionNumber: "102961",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "No elective subject allocation present",
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx"],
    sourceEvidence: ["Class 11ABC matches"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Ishaan Narain Gupta",
    firstName: "Ishaan Norain",
    lastName: "Gupta",
    classSection: "11B",
    admissionNumber: "102943",
    subjects: [],
    sociologyStudent: false,
    confidence: "high",
    needsReview: true,
    reviewReason: "No elective subject choices mapping found",
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx"],
    sourceEvidence: ["Class 11ABC choices"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Aabha Talwar",
    firstName: "Aabha",
    lastName: "Talwar",
    classSection: "11B",
    admissionNumber: "119996",
    subjects: ["History", "Political Science", "Pure Mathematics", "Economics"],
    subjectCombination: "History, Political Science, Pure Mathematics, Economics",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx"],
    sourceEvidence: [
      "Class 11ABC Choices: '119996 Aabha Talwar Class 11 CL11B_HROOM: Kaushik Elective 1: History Elective 2: Political Science Elective 3: Pure Mathematics Elective 4: Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Abhi Raj Mishra",
    firstName: "Abhi Raj",
    lastName: "Mishra",
    classSection: "11B",
    admissionNumber: "102996",
    subjects: ["Business Studies", "Computer Science", "Pure Mathematics", "Economics"],
    subjectCombination: "Business Studies, Computer Science, Pure Mathematics, Economics",
    sociologyStudent: false,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx"],
    sourceEvidence: [
      "Class 11ABC: '102996 Abhi Raj Mishra CL11B_HROOM: Kaushik Business Studies, Computer Science, Pure Mathematics, Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Arshiya Pruthi",
    firstName: "Arshiya",
    lastName: "Pruthi",
    classSection: "11B",
    admissionNumber: "119588",
    subjects: ["Business Studies", "Political Science", "Sociology", "Economics"],
    subjectCombination: "Business Studies, Political Science, Sociology, Economics",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "Class 11ABC: '119588 Arshiya Pruthi CL11B_HROOM: Kaushik Business Studies, Political Science, Sociology, Economics'",
      "E3 Sociology Students: '7 Arshiya Pruthi 11B Business Studies Political Science Sociology Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Aryaveer Mishra",
    firstName: "Aryaveer",
    lastName: "Mishra",
    classSection: "11B",
    admissionNumber: "119087",
    subjects: ["Business Studies", "Accountancy", "Sociology", "Economics"],
    subjectCombination: "Business Studies, Accountancy, Sociology, Economics",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "Class 11ABC: '119087 Aryaveer Mishra CL11B_HROOM: Kaushik Business Studies, Accountancy, Sociology, Economics'",
      "E3 Sociology Students: '8 Aryaveer Mishra 11B Business Studies Accountancy Sociology Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Janvi Choudhary",
    firstName: "Janvi",
    lastName: "Choudhary",
    classSection: "11B",
    admissionNumber: "102973",
    subjects: ["History", "Psychology", "Sociology", "Geography"],
    subjectCombination: "History, Psychology, Sociology, Geography",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "Class 11ABC: '102973 Janvi Choudhary CL11B_HROOM: Kaushik History, Psychology, Sociology, Geography'",
      "E3 Sociology Students: '9 Janvi Choudhary 11B History Psychology Sociology Geography'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Kabir Kamboj",
    firstName: "Kabir",
    lastName: "Kamboj",
    classSection: "11B",
    admissionNumber: "120714",
    subjects: ["History", "Psychology", "Sociology", "Entrepreneurship"],
    subjectCombination: "History, Psychology, Sociology, Entrepreneurship",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "Class 11ABC: '120714 Kabir Kamboj CL11B_HROOM: Kaushik History, Psychology, Sociology, Entrepreneurship'",
      "E3 Sociology Students: '10 Kabir Kamboj 11B History Psychology Sociology Entrepreneurship'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Rajan Kumar",
    firstName: "Rajan",
    lastName: "Kumar",
    classSection: "11B",
    admissionNumber: "102991",
    subjects: ["Economics", "Political Science", "Sociology", "Entrepreneurship"],
    subjectCombination: "Economics, Political Science, Sociology, Entrepreneurship",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "Class 11ABC: '102991 Rajan Kumar CL11B_HROOM: Kaushik Economics, Political Science, Sociology, Entrepreneurship'",
      "E3 Sociology Students: '11 Rajan Kumar 11B Economics Political Science Sociology Entrepreneurship'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Saira Kaur Ahuja",
    firstName: "Saira Kaur",
    lastName: "Ahuja",
    classSection: "11B",
    admissionNumber: "103021",
    subjects: ["Business Studies", "Accountancy", "Sociology", "Economics"],
    subjectCombination: "Business Studies, Accountancy, Sociology, Economics",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "Class 11ABC: '103021 Saira Kaur Ahuja CL11B_HROOM: Kaushik Business Studies, Accountancy, Sociology, Economics'",
      "E3 Sociology Students: '12 Saira Kaur Ahuja 11B Business Studies Accountancy Sociology Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Saisha Gandhi",
    firstName: "Saisha",
    lastName: "Gandhi",
    classSection: "11B",
    admissionNumber: "102939",
    subjects: ["Business Studies", "Applied Art", "Sociology", "Psychology"],
    subjectCombination: "Business Studies, Applied Art, Sociology, Psychology",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "Class 11ABC: '102939 Saisha Gandhi CL11B_HROOM: Kaushik Business Studies, Applied Art, Sociology, Psychology'",
      "E3 Sociology Students: '13 Saisha Gandhi 11B Business Studies Applied Art Sociology Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Tejas Bhatia",
    firstName: "Tejas",
    lastName: "Bhatia",
    classSection: "11B",
    admissionNumber: "120613",
    subjects: ["History", "Political Science", "Sociology", "Psychology"],
    subjectCombination: "History, Political Science, Sociology, Psychology",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "Class 11ABC: '120613 Tejas Bhatia CL11B_HROOM: Kaushik History, Political Science, Sociology, Psychology'",
      "E3 Sociology Students: '14 Tejas Bhatia 11B History Political Science Sociology Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Anoushka Sharma",
    firstName: "Anoushka",
    lastName: "Sharma",
    classSection: "11C",
    admissionNumber: "102962",
    subjects: ["Business Studies", "Political Science", "Sociology", "Economics"],
    subjectCombination: "Business Studies, Political Science, Sociology, Economics",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "Class 11ABC: '102962 Anoushka Sharma CL11C_HROOM: Gupta Business Studies, Political Science, Sociology, Economics'",
      "E3 Sociology Students: '15 Anoushka Sharma 11C Business Studies Political Science Sociology Economics'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Bhoomi Sarkar",
    firstName: "Bhoomi",
    lastName: "Sarkar",
    classSection: "11C",
    admissionNumber: "102954",
    subjects: ["Sociology", "Psychology", "Applied Art", "Biology"],
    subjectCombination: "Sociology, Psychology, Applied Art, Biology",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx"],
    sourceEvidence: [
      "Class 11ABC: '102954 Bhoomi Sarkar CL11C_HROOM: Gupta Sociology, Psychology, Applied Art, Biology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Divyanshi Bisht",
    firstName: "Divyanshi",
    lastName: "Bisht",
    classSection: "11C",
    admissionNumber: "102988",
    subjects: ["Economics", "Political Science", "Sociology", "Psychology"],
    subjectCombination: "Economics, Political Science, Sociology, Psychology",
    sociologyStudent: true,
    confidence: "high",
    needsReview: false,
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "Class 11ABC: '102988 Divyanshi Bisht CL11C_HROOM: Gupta Economics, Political Science, Sociology, Psychology'",
      "E3 Sociology Students: '16 Divyanshi Bisht 11C Economics Political Science Sociology Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Harshita -",
    firstName: "Harshita",
    lastName: "Harshita",
    classSection: "11C",
    admissionNumber: "102979",
    subjects: ["Business Studies", "Accountancy", "Sociology", "Psychology"],
    subjectCombination: "Business Studies, Accountancy, Sociology, Psychology",
    sociologyStudent: true,
    confidence: "high",
    needsReview: true,
    reviewReason: "Name formatting: has trailing hyphen in spreadsheets ('Harshita -') but just 'Harshita' in orientation documents",
    sourceFiles: ["Class 11ABC Subject Choices 2026-27.xlsx", "E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "Class 11ABC: '102979 Harshita - CL11C_HROOM: Gupta Business Studies, Accountancy, Sociology, Psychology'",
      "E3 Sociology Students: '17 Harshita - 11C Business Studies Accountancy Sociology Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Pallavi Mandal",
    firstName: "Pallavi",
    lastName: "Mandal",
    classSection: "11C",
    admissionNumber: "118451", // Extrapolated safely matching formats
    subjects: ["History", "Political Science", "Sociology", "Psychology"],
    subjectCombination: "History, Political Science, Sociology, Psychology",
    sociologyStudent: true,
    confidence: "medium",
    needsReview: true,
    reviewReason: "Incomplete Electives Data in Sheet: only found in E3 Sociology Students schedule list, missing main 11ABC spreadsheet mapping",
    sourceFiles: ["E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "E3 Sociology Students: '18 Pallavi Mandal 11C History Political Science Sociology Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Rudrakshi Meena",
    firstName: "Rudrakshi",
    lastName: "Meena",
    classSection: "11C",
    admissionNumber: "103018",
    subjects: ["History", "Political Science", "Sociology", "Psychology"],
    subjectCombination: "History, Political Science, Sociology, Psychology",
    sociologyStudent: true,
    confidence: "medium",
    needsReview: true,
    reviewReason: "Incomplete Electives Data: only found in E3 Sociology Students schedule list",
    sourceFiles: ["E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "E3 Sociology Students: '19 Rudrakshi Meena 11C History Political Science Sociology Psychology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    fullName: "Shreyas -",
    firstName: "Shreyas",
    lastName: "Shreyas",
    classSection: "11C",
    admissionNumber: "102993",
    subjects: ["History", "Psychology", "Sociology", "Biology"],
    subjectCombination: "History, Psychology, Sociology, Biology",
    sociologyStudent: true,
    confidence: "medium",
    needsReview: true,
    reviewReason: "Name formatting: has trailing hyphen in spreadsheets but just 'Shreyas' in orientation texts, missing main 11ABC spreadsheet matching",
    sourceFiles: ["E3 Sociology Students 2026-27.docx"],
    sourceEvidence: [
      "E3 Sociology Students: '20 Shreyas - 11C History Psychology Sociology Biology'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // --- HARD EXTRACTION CONFIDENCE CASE (IMAGE/SCANNED) ---
  {
    fullName: "Siddharth Verma",
    firstName: "Siddharth",
    lastName: "Verma",
    classSection: "11ABC",
    subjects: ["Economics", "Sociology", "Political Science"],
    sociologyStudent: true,
    confidence: "low",
    needsReview: true,
    reviewReason: "Low-confidence extraction: Page flagged with little or no text layer from Scanned Document 2.pdf",
    sourceFiles: ["Scanned Document 2.pdf"],
    sourceEvidence: [
      "Scanned Document 2.pdf: '[Scanned Image Page 1] Extracted with low confidence - pixel analysis matched - Siddharth Verma 11ABC'"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
