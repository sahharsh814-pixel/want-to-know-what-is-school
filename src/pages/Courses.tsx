
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  BookOpen, 
  GraduationCap,
  Clock,
  Users,
  Award,
  ArrowLeft,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getSupabaseData } from "@/lib/supabaseHelpers";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: string;
  credits: string;
  prerequisites: string;
  syllabus: string[];
  instructor: string;
  schedule: string;
  capacity: string;
  fee: string;
  startDate: string;
  endDate: string;
}

interface CourseCategory {
  id: string;
  name: string;
  description: string;
  courses: Course[];
}

const Courses = () => {
  const [categories, setCategories] = useState<CourseCategory[]>([]);

  useEffect(() => {
    const loadCourses = async () => {
      const savedCourses = await getSupabaseData<CourseCategory[]>('royal-academy-courses', null);
      if (savedCourses) {
        setCategories(savedCourses);
      }
    };
    
    loadCourses();
  }, []);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Header with Back Button */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container-wide py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link to="/">
                <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium hover:bg-accent/10">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  <span>Back to Home</span>
                </Button>
              </Link>
              <Link to="/">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent/10">
                  <Home className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <h1 className="text-xl md:text-2xl font-heading font-bold text-gradient-gold">Our Courses</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-wide py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4 text-gradient-gold">
            Explore Our Programs
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover our comprehensive range of academic programs designed to help you achieve your educational goals
          </p>
        </div>

        {/* Course Categories */}
        <div className="space-y-12">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-royal to-gold p-6">
                  <h2 className="text-2xl font-heading font-bold text-white mb-2">
                    {category.name}
                  </h2>
                  <p className="text-white/80">{category.description}</p>
                  <p className="text-white/90 text-sm mt-2">{category.courses.length} courses available</p>
                </div>
                
                <div className="p-6">
                  {category.courses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>No courses available in this category yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {category.courses.map((course) => (
                        <motion.div
                          key={course.id}
                          whileHover={{ scale: 1.02 }}
                          className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <BookOpen className="h-8 w-8 text-gold" />
                            <span className="text-xs bg-gold/20 text-gold px-2 py-1 rounded-full">
                              {course.level}
                            </span>
                          </div>
                          
                          <h3 className="text-xl font-semibold text-foreground mb-2">
                            {course.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                            {course.description}
                          </p>
                          
                          <div className="space-y-2 text-sm mb-4">
                            <div className="flex items-center space-x-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{course.duration}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{course.instructor}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-muted-foreground">
                              <Award className="h-4 w-4" />
                              <span>{course.credits} credits</span>
                            </div>
                          </div>
                          
                          <div className="pt-4 border-t border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-gold">{course.fee}</span>
                              <Button size="sm" variant="outline">
                                Learn More
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-16">
            <GraduationCap className="h-24 w-24 mx-auto mb-6 text-muted-foreground opacity-50" />
            <h3 className="text-2xl font-semibold mb-2">No Courses Available</h3>
            <p className="text-muted-foreground">
              Check back soon for our upcoming programs and courses.
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Courses;
