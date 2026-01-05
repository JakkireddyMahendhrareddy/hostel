import React, { useEffect, useState } from "react";
import { Plus, Edit, Search, Trash2 } from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";
import { validateIDProof, formatIDProofNumber } from "../utils/idProofValidators";

interface Student {
  student_id: number;
  hostel_id: number;
  hostel_name: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  permanent_address: string;
  present_working_address: string;
  id_proof_type: string;
  id_proof_number: string;
  id_proof_status: "Submitted" | "Not Submitted";
  admission_date: string;
  admission_fee: number;
  admission_status: "Paid" | "Unpaid";
  due_date: string;
  status: "Active" | "Inactive";
  inactive_date: string | null; // Vacated date when student becomes inactive
  room_id: number;
  room_number: string;
  floor_number: number;
  monthly_rent: number;
  // Fee information (current month)
  fee_id?: number | null;
  fee_month?: string | null;
  fee_monthly_rent?: number | null;
  carry_forward?: number | null;
  total_due?: number | null;
  paid_amount?: number | null;
  balance?: number | null;
  fee_status?: "Pending" | "Partially Paid" | "Fully Paid" | "Overdue" | null;
  fee_due_date?: string | null;
}

interface Room {
  room_id: number;
  room_number: string;
  floor_number: number;
  capacity: number;
  occupied_beds: number;
  available_beds: number;
  rent_per_bed: number;
}

interface StudentFormData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  permanent_address: string;
  present_working_address: string;
  id_proof_type: string;
  id_proof_number: string;
  id_proof_status: "Submitted" | "Not Submitted";
  admission_date: string;
  admission_fee: string;
  admission_status: "Paid" | "Unpaid";
  due_date: string;
  status: "Active" | "Inactive";
  room_id: string;
  floor_number: string;
  monthly_rent: string;
}

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Active" | "Inactive" | "All">("Active");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [idProofError, setIdProofError] = useState<string>("");
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<Student | null>(null);

  // Format date to DD-MM-YYYY for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Calculate initial due date (today - 1 day)
  const getInitialDates = () => {
    const today = new Date();
    const admissionDate = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dueDate = yesterday.toISOString().split("T")[0];
    return { admissionDate, dueDate };
  };

  const initialDates = getInitialDates();

  const [formData, setFormData] = useState<StudentFormData>({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "Male",
    phone: "",
    email: "",
    guardian_name: "",
    guardian_phone: "",
    guardian_relation: "Father",
    permanent_address: "",
    present_working_address: "",
    id_proof_type: "Aadhar",
    id_proof_number: "",
    id_proof_status: "Not Submitted",
    admission_date: initialDates.admissionDate,
    admission_fee: "",
    admission_status: "Unpaid",
    due_date: "",
    status: "Active",
    room_id: "",
    floor_number: "",
    monthly_rent: "",
  });

  useEffect(() => {
    fetchStudents();
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reapply filters when students data or filters change
  useEffect(() => {
    applyFilters(searchTerm, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, statusFilter, searchTerm]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get("/students");
      setStudents(response.data.data);
      // Filters will be applied by the useEffect that watches 'students'
    } catch (error) {
      toast.error("Failed to fetch students");
      console.error("Fetch students error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search - Enhanced to search across all columns
  // Combined filter function for search and status
  const applyFilters = (searchValue: string = searchTerm, statusValue: "Active" | "Inactive" | "All" = statusFilter) => {
    let filtered = students;

    // Apply status filter first
    if (statusValue !== "All") {
      filtered = filtered.filter((student) => student.status === statusValue);
    }

    // Apply search filter
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter((student) => {
        // Helper function to safely check if a value includes the search term
        const includes = (field: any) => {
          if (field === null || field === undefined) return false;
          return field.toString().toLowerCase().includes(searchLower);
        };

        return (
          // Basic Info
          includes(student.first_name) ||
          includes(student.last_name) ||
          includes(student.phone) ||
          includes(student.email) ||
          includes(student.student_id) ||
          includes(student.gender) ||
          includes(student.status) ||
          // Guardian Info
          includes(student.guardian_name) ||
          includes(student.guardian_phone) ||
          includes(student.guardian_relation) ||
          // Address
          includes(student.permanent_address) ||
          includes(student.present_working_address) ||
          // ID Proof
          includes(student.id_proof_type) ||
          includes(student.id_proof_number) ||
          includes(student.id_proof_status) ||
          // Admission & Financial
          includes(student.admission_status) ||
          includes(student.admission_fee) ||
          // Room Info
          includes(student.room_number) ||
          includes(student.floor_number) ||
          includes(student.monthly_rent) ||
          includes(student.hostel_name)
        );
      });
    }

    setFilteredStudents(filtered);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    applyFilters(value, statusFilter);
  };

  const handleStatusFilter = (value: "Active" | "Inactive" | "All") => {
    setStatusFilter(value);
    applyFilters(searchTerm, value);
  };

  const fetchRooms = async (includeFullRooms: boolean = false) => {
    try {
      const response = await api.get("/rooms");
      if (includeFullRooms) {
        // When editing, show all rooms including full ones
        setRooms(response.data.data);
      } else {
        // When adding new student, show only available rooms
        const availableRooms = response.data.data.filter(
          (room: Room) => room.available_beds > 0
        );
        setRooms(availableRooms);
      }
    } catch (error) {
      console.error("Fetch rooms error:", error);
    }
  };

  const fetchHostelAdmissionFee = async () => {
    try {
      const response = await api.get("/hostels");
      const hostels = response.data.data || [];
      if (hostels.length > 0) {
        const hostel = hostels[0];
        const admissionFee = hostel.admission_fee || 0;
        const hostelType = hostel.hostel_type || "";
        
        // Auto-populate admission fee when opening modal for new student
        if (!editingStudent) {
          // Set default gender based on hostel type
          let defaultGender = "";
          if (hostelType === "Boys") {
            defaultGender = "Male";
          } else if (hostelType === "Girls") {
            defaultGender = "Female";
          } else if (hostelType === "Co-ed" || hostelType === "Co-Ed") {
            // For Co-ed, leave empty (user must select)
            defaultGender = "";
          }
          
          setFormData((prev) => ({
            ...prev,
            admission_fee: admissionFee.toString(),
            gender: defaultGender || prev.gender,
          }));
        }
      }
    } catch (error) {
      console.error("Fetch hostel admission fee error:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    
    // Limit phone and guardian_phone to 10 digits (numbers only)
    if (name === "phone" || name === "guardian_phone") {
      // Only allow numbers and limit to 10 digits
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
      return;
    }
    
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-fill floor and monthly rent when room is selected
      if (name === "room_id") {
        if (value) {
          const selectedRoom = rooms.find((r) => r.room_id === parseInt(value));
          if (selectedRoom) {
            updated.floor_number = selectedRoom.floor_number?.toString() || "";
            updated.monthly_rent = selectedRoom.rent_per_bed.toString();

            // Show warning if room is full
            if (selectedRoom.occupied_beds >= selectedRoom.capacity) {
              toast.error(
                `Room ${selectedRoom.room_number} is full! (${selectedRoom.occupied_beds}/${selectedRoom.capacity} beds occupied)`
              );
            }
          }
        } else {
          // Clear floor and rent if no room selected
          updated.floor_number = "";
          updated.monthly_rent = "";
        }
      }

      // Auto-calculate due_date when admission_date changes (admission_date - 1 day)
      // Only auto-fill if due_date is empty or not manually changed
      if (name === "admission_date" && value && !editingStudent) {
        const admissionDate = new Date(value);
        const dueDate = new Date(admissionDate);
        dueDate.setDate(dueDate.getDate() - 1);
        updated.due_date = dueDate.toISOString().split("T")[0];
      }

      // Validate ID Proof Number in real-time
      if (name === "id_proof_number" || name === "id_proof_type") {
        const proofType = name === "id_proof_type" ? value : updated.id_proof_type;
        let proofNumber = name === "id_proof_number" ? value : updated.id_proof_number;
        
        // Limit input length based on ID proof type (count only alphanumeric characters, ignore spaces)
        if (name === "id_proof_number" && proofType && proofNumber) {
          const cleaned = proofNumber.replace(/\s/g, ''); // Remove spaces for counting
          let maxChars = 0;
          
          switch (proofType) {
            case 'Aadhar':
            case 'Aadhaar':
              maxChars = 12; // 12 digits only
              break;
            case 'PAN':
              maxChars = 10; // 10 characters (5 letters + 4 digits + 1 letter)
              break;
            case 'Voter ID':
              maxChars = 10; // 10 characters (3 letters + 7 digits)
              break;
            case 'Driving License':
              maxChars = 15; // 15 characters (2 letters + 2 digits + 4 year + 7 digits)
              break;
            default:
              maxChars = 20; // Default limit
          }
          
          // If cleaned length exceeds max, truncate by removing excess characters from end
          if (cleaned.length > maxChars) {
            let truncated = '';
            let charCount = 0;
            // Rebuild string, counting only alphanumeric characters
            for (let i = 0; i < proofNumber.length; i++) {
              if (proofNumber[i] === ' ') {
                truncated += ' '; // Keep spaces
              } else if (charCount < maxChars) {
                truncated += proofNumber[i];
                charCount++;
              } else {
                break; // Stop when we've reached maxChars
              }
            }
            proofNumber = truncated;
            updated.id_proof_number = proofNumber;
          }
        }
        
        if (proofType && proofNumber && proofNumber.trim()) {
          const validation = validateIDProof(proofType, proofNumber);
          if (!validation.isValid) {
            setIdProofError(validation.error || "Invalid ID Proof number");
          } else {
            setIdProofError("");
          }
        } else {
          setIdProofError("");
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number length
    if (formData.phone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    // Check if phone number already exists (only for new students)
    if (!editingStudent) {
      const existingStudent = students.find(
        (s) => s.phone === formData.phone && s.status === "Active"
      );
      if (existingStudent) {
        toast.error("This phone number is already registered to another student");
        return;
      }
    } else {
      // For editing, check if phone exists for a different student
      const existingStudent = students.find(
        (s) => s.phone === formData.phone && 
               s.student_id !== editingStudent.student_id && 
               s.status === "Active"
      );
      if (existingStudent) {
        toast.error("This phone number is already registered to another student");
        return;
      }
    }

    // Validate ID Proof Number
    let formattedIdProofNumber = formData.id_proof_number || null;
    if (formData.id_proof_type && formData.id_proof_number) {
      const idProofValidation = validateIDProof(formData.id_proof_type, formData.id_proof_number);
      if (!idProofValidation.isValid) {
        toast.error(idProofValidation.error || "Invalid ID Proof number");
        setIdProofError(idProofValidation.error || "Invalid ID Proof number");
        return;
      }
      setIdProofError("");
      // Format the ID proof number before storing
      formattedIdProofNumber = formatIDProofNumber(formData.id_proof_type, formData.id_proof_number);
    }

    const payload = {
      first_name: formData.first_name,
      last_name: formData.last_name || null,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender,
      phone: formData.phone,
      email: formData.email || null,
      guardian_name: formData.guardian_name,
      guardian_phone: formData.guardian_phone,
      guardian_relation: formData.guardian_relation || null,
      permanent_address: formData.permanent_address || null,
      present_working_address: formData.present_working_address || null,
      id_proof_type: formData.id_proof_type || null,
      id_proof_number: formattedIdProofNumber,
      id_proof_status: formData.id_proof_status,
      admission_date: formData.admission_date,
      admission_fee: parseFloat(formData.admission_fee) || 0,
      admission_status: formData.admission_status,
      due_date: formData.due_date || null,
      status: formData.status,
      room_id: formData.room_id ? parseInt(formData.room_id) : null,
      floor_number: formData.floor_number
        ? parseInt(formData.floor_number)
        : null,
      monthly_rent: formData.monthly_rent
        ? parseFloat(formData.monthly_rent)
        : null,
    };

    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent.student_id}`, payload);
        toast.success("Student updated successfully");
      } else {
        await api.post("/students", payload);
        toast.success("Student registered successfully");
      }
      fetchStudents();
      fetchRooms();
      handleCloseModal();
    } catch (error) {
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to save student";
      toast.error(errorMessage);
      console.error("Save student error:", error);
    }
  };

  const handleDelete = async (student: Student) => {
    try {
      await api.delete(`/students/${student.student_id}`);
      toast.success("Student deleted permanently");
      fetchStudents();
      fetchRooms();
      setDeleteConfirmModal(null);
    } catch (error) {
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to delete student";
      toast.error(errorMessage);
      console.error("Delete student error:", error);
    }
  };

  const handleEdit = async (student: Student) => {
    setEditingStudent(student);
    setIdProofError(""); // Clear any previous validation errors

    // Fetch all rooms including full ones for editing
    await fetchRooms(true);

    // Format dates for HTML date input (YYYY-MM-DD) with timezone fix
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      // Get local date components to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setFormData({
      first_name: student.first_name,
      last_name: student.last_name || "",
      date_of_birth: formatDate(student.date_of_birth),
      gender: student.gender || "Male",
      phone: student.phone,
      email: student.email || "",
      guardian_name: student.guardian_name || "",
      guardian_phone: student.guardian_phone,
      guardian_relation: student.guardian_relation || "Father",
      permanent_address: student.permanent_address || "",
      present_working_address: student.present_working_address || "",
      id_proof_type: student.id_proof_type || "Aadhar",
      id_proof_number: student.id_proof_number || "",
      id_proof_status: student.id_proof_status || "Not Submitted",
      admission_date: formatDate(student.admission_date),
      admission_fee: student.admission_fee
        ? student.admission_fee.toString()
        : "",
      admission_status: student.admission_status || "Unpaid",
      due_date: student.due_date || "",
      status: student.status || "Active",
      room_id: student.room_id ? student.room_id.toString() : "",
      floor_number: student.floor_number ? student.floor_number.toString() : "",
      monthly_rent: student.monthly_rent ? student.monthly_rent.toString() : "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    const dates = getInitialDates();
    setFormData({
      first_name: "",
      last_name: "",
      date_of_birth: "",
      gender: "Male",
      phone: "",
      email: "",
      guardian_name: "",
      guardian_phone: "",
      guardian_relation: "Father",
      permanent_address: "",
      present_working_address: "",
      id_proof_type: "Aadhar",
      id_proof_number: "",
      id_proof_status: "Not Submitted",
      admission_date: dates.admissionDate,
      admission_fee: "",
      admission_status: "Unpaid",
      due_date: "",
      status: "Active",
      room_id: "",
      floor_number: "",
      monthly_rent: "",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Student Management
          </h1>
          <p className="text-sm text-gray-600">
            Manage student registrations and room allocations
          </p>
        </div>
        <button
          onClick={async () => {
            // Reset form first
            setEditingStudent(null);
            const dates = getInitialDates();
            
            // Fetch hostel type to set default gender
            let defaultGender = "";
            try {
              const response = await api.get("/hostels");
              const hostels = response.data.data || [];
              if (hostels.length > 0) {
                const hostelType = hostels[0].hostel_type || "";
                if (hostelType === "Boys") {
                  defaultGender = "Male";
                } else if (hostelType === "Girls") {
                  defaultGender = "Female";
                } else if (hostelType === "Co-ed" || hostelType === "Co-Ed") {
                  // For Co-ed, leave empty (user must select)
                  defaultGender = "";
                }
              }
            } catch (error) {
              console.error("Fetch hostel type error:", error);
              // Default to Male if error
              defaultGender = "Male";
            }
            
            setFormData({
              first_name: "",
              last_name: "",
              date_of_birth: "",
              gender: defaultGender,
              phone: "",
              email: "",
              guardian_name: "",
              guardian_phone: "",
              guardian_relation: "Father",
              permanent_address: "",
              present_working_address: "",
              id_proof_type: "Aadhar",
              id_proof_number: "",
              id_proof_status: "Not Submitted",
              admission_date: dates.admissionDate,
              admission_fee: "",
              admission_status: "Unpaid",
              due_date: dates.dueDate,
              status: "Active",
              room_id: "",
              floor_number: "",
              monthly_rent: "",
            });
            
            fetchHostelAdmissionFee();
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Student
        </button>
      </div>

      {/* Search Bar and Filter */}
      <div className="flex justify-between items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, phone, email, room..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
          />
        </div>

        {/* Status Filter Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value as "Active" | "Inactive" | "All")}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm min-w-[150px]"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="All">All Students</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-primary-600">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  S.NO
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Room
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Floor
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Rent/Month
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Admission Fee
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Admission Status
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Admitted Date
                </th>
                {statusFilter !== "Active" && (
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                    Vacated Date
                  </th>
                )}
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student, index) => (
                <tr
                  key={student.student_id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setViewingStudent(student)}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {student.first_name} {student.last_name}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {student.phone}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {student.room_number || "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {student.floor_number || "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {student.monthly_rent
                      ? `₹${Math.floor(student.monthly_rent)}`
                      : "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {student.admission_fee
                      ? `₹${Math.floor(student.admission_fee)}`
                      : "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {student.admission_status === "Paid" ? (
                      <span className="px-2 py-0.5 text-[10px] font-medium text-green-800 bg-green-100 rounded-full">
                        Paid
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-medium text-yellow-800 bg-yellow-100 rounded-full">
                        Unpaid
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {formatDateDisplay(student.admission_date)}
                  </td>
                  {statusFilter !== "Active" && (
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {student.status === "Inactive" && student.inactive_date 
                        ? formatDateDisplay(student.inactive_date) 
                        : "-"}
                    </td>
                  )}
                  <td
                    className="px-3 py-2 whitespace-nowrap text-xs text-gray-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(student)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Student"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {student.status === "Inactive" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmModal(student);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm
                ? "No students found matching your search."
                : "No students found. Add your first student to get started."}
            </p>
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">{filteredStudents.length}</span> of{" "}
            <span className="font-medium">
              {statusFilter === "Active"
                ? students.filter(s => s.status === "Active").length
                : statusFilter === "Inactive"
                ? students.filter(s => s.status === "Inactive").length
                : students.length}
            </span>{" "}
            student{filteredStudents.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* View Details Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setViewingStudent(null)}
            ></div>

            <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-base font-bold text-gray-900">
                  Student Details
                </h2>
                <button
                  onClick={() => setViewingStudent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Personal Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 border-b pb-1">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Student ID
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.student_id}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Hostel
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.hostel_name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Full Name
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.first_name} {viewingStudent.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Gender
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.gender}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Date of Birth
                      </label>
                      <p className="text-sm text-gray-900">
                        {formatDateDisplay(viewingStudent.date_of_birth)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Admission Date
                      </label>
                      <p className="text-sm text-gray-900">
                        {formatDateDisplay(viewingStudent.admission_date)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 border-b pb-1">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Phone
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.phone}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Email
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.email || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Guardian Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 border-b pb-1">
                    Guardian Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Guardian Name
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.guardian_name || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Guardian Phone
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.guardian_phone}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Relation
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.guardian_relation || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 border-b pb-1">
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Permanent Address
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.permanent_address || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Present Working Address
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.present_working_address || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ID Proof Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 border-b pb-1">
                    ID Proof Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        ID Proof Type
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.id_proof_type || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        ID Proof Number
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.id_proof_number || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        ID Proof Status
                      </label>
                      {viewingStudent.id_proof_status === "Submitted" ? (
                        <span className="px-2 py-0.5 text-[10px] font-medium text-green-800 bg-green-100 rounded-full inline-block">
                          Submitted
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium text-red-800 bg-red-100 rounded-full inline-block">
                          Not Submitted
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Room Allocation */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 border-b pb-1">
                    Room Allocation
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Room Number
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.room_number || "Not Allocated"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Floor Number
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.floor_number || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Monthly Rent
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.monthly_rent
                          ? `₹${Math.floor(viewingStudent.monthly_rent)}`
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 border-b pb-1">
                    Financial Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Admission Fee
                      </label>
                      <p className="text-sm text-gray-900">
                        {viewingStudent.admission_fee
                          ? `₹${Math.floor(viewingStudent.admission_fee)}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Admission Status
                      </label>
                      {viewingStudent.admission_status === "Paid" ? (
                        <span className="px-2 py-0.5 text-[10px] font-medium text-green-800 bg-green-100 rounded-full">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium text-yellow-800 bg-yellow-100 rounded-full">
                          Unpaid
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => {
                    setViewingStudent(null);
                    handleEdit(viewingStudent);
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div
              className="fixed inset-0 bg-black opacity-50"
              onClick={handleCloseModal}
            ></div>

            <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
              <h2 className="text-base font-bold text-gray-900 mb-3">
                {editingStudent ? "Edit Student" : "Add New Student"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Personal Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Gender *
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        required
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        maxLength={10}
                        pattern="[0-9]{10}"
                        placeholder="Enter 10 digit phone number"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      {formData.phone.length > 0 && formData.phone.length !== 10 && (
                        <p className="text-xs text-red-600 mt-1">
                          Phone number must be exactly 10 digits
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Admission Date *
                      </label>
                      <input
                        type="date"
                        name="admission_date"
                        value={formData.admission_date}
                        onChange={handleInputChange}
                        required
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Admission Fee (₹) *
                      </label>
                      <input
                        type="number"
                        name="admission_fee"
                        value={formData.admission_fee}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="100"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Admission Status *
                      </label>
                      <select
                        name="admission_status"
                        value={formData.admission_status}
                        onChange={handleInputChange}
                        required
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Status *
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Guardian Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Guardian Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Guardian Name *
                      </label>
                      <input
                        type="text"
                        name="guardian_name"
                        value={formData.guardian_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Guardian Phone *
                      </label>
                      <input
                        type="tel"
                        name="guardian_phone"
                        value={formData.guardian_phone}
                        onChange={handleInputChange}
                        required
                        maxLength={10}
                        pattern="[0-9]{10}"
                        placeholder="Enter 10 digit phone number"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      {formData.guardian_phone.length > 0 && formData.guardian_phone.length !== 10 && (
                        <p className="text-xs text-red-600 mt-1">
                          Phone number must be exactly 10 digits
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Relation
                      </label>
                      <select
                        name="guardian_relation"
                        value={formData.guardian_relation}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Address & ID Proof */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Address & ID Proof
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Permanent Address
                      </label>
                      <textarea
                        name="permanent_address"
                        value={formData.permanent_address}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Present Working Address
                      </label>
                      <textarea
                        name="present_working_address"
                        value={formData.present_working_address}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ID Proof Type
                      </label>
                      <select
                        name="id_proof_type"
                        value={formData.id_proof_type}
                        onChange={(e) => {
                          handleInputChange(e);
                          // Clear ID proof number and error when type changes
                          setFormData((prev) => ({ ...prev, id_proof_number: "" }));
                          setIdProofError("");
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="Aadhar">Aadhar Card</option>
                        <option value="PAN">PAN Card</option>
                        <option value="Voter ID">Voter ID</option>
                        <option value="Driving License">Driving License</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ID Proof Number
                      </label>
                      <input
                        type="text"
                        name="id_proof_number"
                        value={formData.id_proof_number}
                        onChange={handleInputChange}
                        maxLength={
                          formData.id_proof_type === "Aadhar"
                            ? 14 // 12 digits + 2 spaces (XXXX XXXX XXXX)
                            : formData.id_proof_type === "PAN"
                            ? 10 // ABCDE1234F (10 characters)
                            : formData.id_proof_type === "Voter ID"
                            ? 10 // ABC1234567 (10 characters)
                            : formData.id_proof_type === "Driving License"
                            ? 17 // TS09 20110012345 (with spaces: 15 chars + 2 spaces)
                            : 20 // Default
                        }
                        className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          idProofError ? "border-red-300 focus:border-red-500" : "border-gray-300"
                        }`}
                        placeholder={
                          formData.id_proof_type === "Aadhar"
                            ? "1234 5678 9012"
                            : formData.id_proof_type === "PAN"
                            ? "ABCDE1234F"
                            : formData.id_proof_type === "Voter ID"
                            ? "ABC1234567"
                            : formData.id_proof_type === "Driving License"
                            ? "TS09 20110012345"
                            : "Enter ID Proof number"
                        }
                      />
                      {idProofError && (
                        <p className="text-xs text-red-600 mt-1">{idProofError}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ID Proof Status
                      </label>
                      <select
                        name="id_proof_status"
                        value={formData.id_proof_status}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="Not Submitted">Not Submitted</option>
                        <option value="Submitted">Submitted</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Room Allocation (Optional) */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Room Allocation {editingStudent ? "" : "(Optional)"}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Room
                      </label>
                      <select
                        name="room_id"
                        value={formData.room_id}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select Room</option>
                        {rooms.map((room) => (
                          <option key={room.room_id} value={room.room_id}>
                            Room {room.room_number} (Floor {room.floor_number})
                            - Total: {room.capacity} | Available:{" "}
                            {room.available_beds}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Floor Number
                      </label>
                      <input
                        type="text"
                        name="floor_number"
                        value={formData.floor_number}
                        readOnly
                        placeholder="Auto-filled"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Monthly Rent (₹)
                      </label>
                      <input
                        type="number"
                        name="monthly_rent"
                        value={formData.monthly_rent}
                        onChange={handleInputChange}
                        min="0"
                        step="100"
                        placeholder="Enter monthly rent"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {editingStudent ? "Update Student" : "Register Student"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setDeleteConfirmModal(null)}
            ></div>

            <div className="relative bg-white rounded-lg max-w-md w-full p-6 z-10">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              
              <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
                Delete Student
              </h2>
              
              <p className="text-sm text-gray-600 text-center mb-6">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold">
                  {deleteConfirmModal.first_name} {deleteConfirmModal.last_name}
                </span>
                ? This action cannot be undone and will delete all related data including payments, dues, and fees.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmModal(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmModal)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
