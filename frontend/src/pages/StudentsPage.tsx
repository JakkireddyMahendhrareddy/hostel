import React, { useEffect, useState } from "react";
import { Plus, Edit, Search, ChevronDown, ChevronUp, Eye, Users, X } from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

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
  room_id: number;
  room_number: string;
  floor_number: number;
  monthly_rent: number;
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
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [showStatsCard, setShowStatsCard] = useState(false);
  const [hostelStats, setHostelStats] = useState<{
    totalStudents: number;
    totalCapacity: number;
    remaining: number;
  } | null>(null);

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
    fetchHostelStats();
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

  const fetchHostelStats = async () => {
    try {
      const [roomsResponse, studentsResponse] = await Promise.all([
        api.get("/rooms"),
        api.get("/students")
      ]);
      
      const rooms = roomsResponse.data.data || [];
      const allStudents = studentsResponse.data.data || [];
      
      const totalCapacity = rooms.reduce((sum: number, room: Room) => {
        const capacity = room.total_capacity || (room.occupied_beds + room.available_beds) || room.room_type_id || 0;
        return sum + capacity;
      }, 0);
      
      const totalOccupied = rooms.reduce((sum: number, room: Room) => sum + (room.occupied_beds || 0), 0);
      const totalStudents = allStudents.filter((s: Student) => s.status === "Active").length;
      const remaining = totalCapacity - totalOccupied;
      
      setHostelStats({
        totalStudents,
        totalCapacity,
        remaining
      });
    } catch (error) {
      console.error("Fetch hostel stats error:", error);
    }
  };

  // Update stats when students change
  useEffect(() => {
    if (students.length > 0) {
      fetchHostelStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const fetchHostelAdmissionFee = async () => {
    try {
      const response = await api.get("/hostels");
      const hostels = response.data.data || [];
      if (hostels.length > 0) {
        const admissionFee = hostels[0].admission_fee || 0;
        // Auto-populate admission fee when opening modal for new student
        if (!editingStudent) {
          setFormData((prev) => ({
            ...prev,
            admission_fee: admissionFee.toString(),
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

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      id_proof_number: formData.id_proof_number || null,
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

  const handleEdit = async (student: Student) => {
    setEditingStudent(student);

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
      {/* Mobile Header */}
      <div className="md:hidden space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Student Management
          </h1>
          <p className="text-sm text-gray-600">
            Manage student registrations and room allocations
          </p>
        </div>

        {/* Mobile Search Bar and Filter - Single Line */}
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value as "Active" | "Inactive" | "All")}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm whitespace-nowrap"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="All">All Students</option>
          </select>
        </div>
      </div>

      {/* Desktop: Single Line Header */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Left: Title */}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            Student Management
          </h1>
        </div>
        
        {/* Right: Search, Status Filter, Add Student */}
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm w-48"
            />
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value as "Active" | "Inactive" | "All")}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="All">All Students</option>
          </select>

          {/* Add Student Button */}
          <button
            onClick={() => {
              fetchHostelAdmissionFee();
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm whitespace-nowrap"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Student
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm
                ? "No students found matching your search."
                : "No students found. Add your first student to get started."}
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const isExpanded = expandedCardId === student.student_id;
            return (
              <div
                key={student.student_id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all ${isExpanded ? 'shadow-lg' : ''}`}
              >
                <div className="p-4">
                  {/* Collapsed View */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedCardId(isExpanded ? null : student.student_id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-900 truncate">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{student.phone}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2 text-right">
                      {student.admission_status === "Paid" ? (
                        <span className="px-2.5 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                          Unpaid
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Room</p>
                          <p className="text-sm font-medium text-gray-900">
                            {student.room_number || "Not Allocated"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Floor</p>
                          <p className="text-sm font-medium text-gray-900">
                            {student.floor_number || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Rent/Month</p>
                          <p className="text-sm font-medium text-gray-900">
                            {student.monthly_rent
                              ? `₹${Math.floor(student.monthly_rent)}`
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Admission Fee</p>
                          <p className="text-sm font-medium text-gray-900">
                            {student.admission_fee
                              ? `₹${Math.floor(student.admission_fee)}`
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Admitted Date</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDateDisplay(student.admission_date)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCardId(null);
                            setViewingStudent(student);
                          }}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCardId(null);
                            handleEdit(student);
                          }}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
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

      {/* Mobile Summary */}
      <div className="block md:hidden px-4 py-3 bg-gray-50 rounded-lg">
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
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={handleCloseModal}
          ></div>

          {/* Mobile: Bottom Sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto z-10">
            {/* Drag Handle and Header */}
            <div className="sticky top-0 bg-white rounded-t-2xl pt-3 pb-2 z-20">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
              </div>
              <div className="px-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingStudent ? "Edit Student" : "Add New Student"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Close"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-4 pb-6">
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
                        pattern="[0-9]{10}"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
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
                        pattern="[0-9]{10}"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
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
                        onChange={handleInputChange}
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
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
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

          {/* Desktop: Centered Modal */}
          <div className="hidden md:flex items-center justify-center min-h-screen px-4 py-4">
            <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
              {/* Header with Close Button */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingStudent ? "Edit Student" : "Add New Student"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Close"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

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
                        pattern="[0-9]{10}"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
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
                        pattern="[0-9]{10}"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
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
                        onChange={handleInputChange}
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
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
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

      {/* Floating Action Buttons - Mobile Only */}
      {!showModal && !viewingStudent && !showStatsCard && (
        <>
          {/* Left Side: Statistics Button (Orange) */}
          <button
            onClick={() => setShowStatsCard(true)}
            className="fixed bottom-6 left-6 z-40 h-14 w-14 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-all hover:scale-110 active:scale-95 flex items-center justify-center md:hidden"
            title="View Statistics"
          >
            <Plus className="h-6 w-6" />
          </button>

          {/* Right Side: Add Student Button (Blue) */}
          <button
            onClick={() => {
              fetchHostelAdmissionFee();
              setShowModal(true);
            }}
            className="fixed bottom-6 right-6 z-40 h-14 w-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-110 active:scale-95 flex items-center justify-center md:hidden"
            title="Add Student"
          >
            <Plus className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Statistics Card Modal - Mobile Only */}
      {showStatsCard && (
        <div className="md:hidden fixed inset-0 z-30">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 transition-opacity duration-300"
            onClick={() => setShowStatsCard(false)}
          ></div>

          {/* Bottom Sheet - Full Width */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-10 transform transition-transform duration-300 ease-out">
            {/* Drag Handle */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-16 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            {/* Content */}
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Hostel Statistics</h3>
                <button
                  onClick={() => setShowStatsCard(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {hostelStats ? (
                <div className="space-y-4">
                  {/* Total Students */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 w-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-2 font-medium">Total Students</p>
                        <p className="text-4xl font-bold text-blue-600">{hostelStats.totalStudents}</p>
                      </div>
                      <Users className="h-10 w-10 text-blue-400" />
                    </div>
                  </div>

                  {/* Total Capacity */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 w-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-2 font-medium">Total Capacity</p>
                        <p className="text-4xl font-bold text-purple-600">{hostelStats.totalCapacity}</p>
                      </div>
                      <Users className="h-10 w-10 text-purple-400" />
                    </div>
                  </div>

                  {/* Vacancies */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 w-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-2 font-medium">Vacancies</p>
                        <p className="text-4xl font-bold text-green-600">{hostelStats.remaining}</p>
                      </div>
                      <Users className="h-10 w-10 text-green-400" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading statistics...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
