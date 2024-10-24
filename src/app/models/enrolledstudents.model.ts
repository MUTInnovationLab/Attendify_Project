// Define the interface for a single enrolled student
interface EnrolledStudent {
    status: string;       // The enrollment status of the student
    studentNumber: string; // The unique identifier for the student
  }
  
  // Define the interface for the enrolled modules document
  interface EnrolledModule {
    moduleCode: string;      // The module code, which is the document ID
    enrolled: EnrolledStudent[]; // An array of enrolled students
  }
  
  // Example of how to use the interface
  const exampleEnrolledModule: EnrolledModule = {
    moduleCode: "CA100",
    enrolled: [
      { status: "Enrolled", studentNumber: "22005010" },
      { status: "Enrolled", studentNumber: "22106645" },
      { status: "Enrolled", studentNumber: "221165" },
      { status: "Enrolled", studentNumber: "22135116" }
    ]
  };
  
  