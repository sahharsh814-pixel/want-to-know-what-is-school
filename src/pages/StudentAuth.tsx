import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GraduationCap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

const StudentAuth = () => {
  const [studentUsername, setStudentUsername] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Check localStorage for student auth - check both regular students and auth students
      const students = JSON.parse(localStorage.getItem('royal-academy-students') || '[]');
      const authStudents = JSON.parse(localStorage.getItem('royal-academy-auth-students') || '[]');

      console.log('=== LOGIN ATTEMPT ===');
      console.log('Trying to login with:', { studentUsername, studentId });
      console.log('Available students in royal-academy-students:', students);
      console.log('Available auth students in royal-academy-auth-students:', authStudents);

      // Let's also check if there are any students at all
      if (students.length === 0 && authStudents.length === 0) {
        setError('No students found in the system. Please ask your teacher to create your account.');
        return;
      }

      // First try to find in auth students (created by teacher)
      let student = authStudents.find((s: any) => {
        const usernameMatch = s.username === studentUsername || 
                             s.name === studentUsername || 
                             s.fullName === studentUsername ||
                             s.username?.toLowerCase() === studentUsername.toLowerCase() ||
                             s.name?.toLowerCase() === studentUsername.toLowerCase() ||
                             s.fullName?.toLowerCase() === studentUsername.toLowerCase();
        const idMatch = s.studentId === studentId || s.id === studentId;
        const statusOk = s.status !== 'banned';

        console.log('Checking auth student:', s, { usernameMatch, idMatch, statusOk });
        return usernameMatch && idMatch && statusOk;
      });

      // If not found in auth students, try regular students
      if (!student) {
        student = students.find((s: any) => {
          const usernameMatch = s.name === studentUsername || 
                               s.fullName === studentUsername ||
                               s.name?.toLowerCase() === studentUsername.toLowerCase() ||
                               s.fullName?.toLowerCase() === studentUsername.toLowerCase();
          const idMatch = s.id === studentId;
          const statusOk = s.status === 'active' || !s.status;

          console.log('Checking regular student:', s, { usernameMatch, idMatch, statusOk });
          return usernameMatch && idMatch && statusOk;
        });

        // If found in regular students but not in auth students, sync them
        if (student) {
          console.log('Found student in regular database, syncing to auth database...');
          const newAuthStudent = {
            ...student,
            username: student.name || student.fullName,
            studentId: student.id,
            type: 'student',
            password: `${(student.name || student.fullName).split(' ')[0].toLowerCase()}123`,
            createdAt: new Date().toISOString()
          };

          const updatedAuthStudents = [...authStudents, newAuthStudent];
          localStorage.setItem('royal-academy-auth-students', JSON.stringify(updatedAuthStudents));
          console.log('Student synced to auth database:', newAuthStudent);
        }
      }

      console.log('Found student:', student);

      if (student) {
        // Set authentication with all necessary flags
        localStorage.setItem("studentAuth", "true");
        localStorage.setItem("studentEmail", student.email);
        localStorage.setItem("studentId", student.studentId || student.id);
        localStorage.setItem("studentName", student.username || student.name || student.fullName);
        localStorage.setItem("currentStudent", JSON.stringify(student));

        console.log('[StudentAuth] Login successful, auth set for:', student.email);

        // Navigate to dashboard
        navigate("/student-dashboard", { replace: true });
      } else {
        setError("Invalid student username or student ID. Please check your credentials.");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-royal-blue via-royal-purple to-royal-gold flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-border/50">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-royal-blue to-royal-purple rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Student Portal</h1>
            <p className="text-muted-foreground">Access your academic dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Student Username</label>
              <Input
                type="text"
                value={studentUsername}
                onChange={(e) => setStudentUsername(e.target.value)}
                placeholder="Enter your full name"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Student ID</label>
              <Input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter your student ID (e.g., STU123456)"
                required
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-royal-blue to-royal-purple hover:from-royal-blue/90 hover:to-royal-purple/90"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Need help? Contact your teacher or administrator
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentAuth;