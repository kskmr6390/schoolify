import { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

type AttendanceStatus = 'present' | 'absent' | 'late' | null

interface Student {
  id: string
  name: string
  rollNumber: string
  status: AttendanceStatus
}

const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'Alice Johnson', rollNumber: '01', status: null },
  { id: '2', name: 'Bob Martinez', rollNumber: '02', status: null },
  { id: '3', name: 'Carol White', rollNumber: '03', status: null },
  { id: '4', name: 'David Lee', rollNumber: '04', status: null },
  { id: '5', name: 'Emma Wilson', rollNumber: '05', status: null },
  { id: '6', name: 'Frank Brown', rollNumber: '06', status: null },
  { id: '7', name: 'Grace Davis', rollNumber: '07', status: null },
  { id: '8', name: 'Henry Taylor', rollNumber: '08', status: null },
]

const STATUS_CONFIG: Record<NonNullable<AttendanceStatus>, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  present: { color: '#10B981', icon: 'checkmark-circle', label: 'P' },
  absent: { color: '#EF4444', icon: 'close-circle', label: 'A' },
  late: { color: '#F59E0B', icon: 'time', label: 'L' },
}

function StudentRow({
  student,
  onMark,
}: {
  student: Student
  onMark: (id: string, status: AttendanceStatus) => void
}) {
  return (
    <View style={styles.studentRow}>
      <View style={styles.studentInfo}>
        <View style={styles.rollBadge}>
          <Text style={styles.rollText}>{student.rollNumber}</Text>
        </View>
        <Text style={styles.studentName}>{student.name}</Text>
      </View>
      <View style={styles.statusButtons}>
        {(Object.keys(STATUS_CONFIG) as NonNullable<AttendanceStatus>[]).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => onMark(student.id, student.status === s ? null : s)}
            style={[
              styles.statusBtn,
              student.status === s && { backgroundColor: STATUS_CONFIG[s].color },
            ]}
          >
            <Text
              style={[
                styles.statusBtnText,
                { color: student.status === s ? 'white' : STATUS_CONFIG[s].color },
              ]}
            >
              {STATUS_CONFIG[s].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export default function AttendanceScreen() {
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS)
  const [selectedClass] = useState('Grade 10-A')
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const markAll = (status: AttendanceStatus) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })))
  }

  const markOne = (id: string, status: AttendanceStatus) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
  }

  const summary = {
    present: students.filter((s) => s.status === 'present').length,
    absent: students.filter((s) => s.status === 'absent').length,
    late: students.filter((s) => s.status === 'late').length,
    unmarked: students.filter((s) => s.status === null).length,
  }

  const handleSubmit = () => {
    if (summary.unmarked > 0) {
      Alert.alert(
        'Incomplete Attendance',
        `${summary.unmarked} student(s) not yet marked. Mark them before submitting.`,
      )
      return
    }
    Alert.alert('Attendance Saved', `Marked for ${selectedClass} — ${today}`)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.classTitle}>{selectedClass}</Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>
        <TouchableOpacity style={styles.classSelector}>
          <Ionicons name="chevron-down" size={16} color="#4F46E5" />
          <Text style={styles.classSelectorText}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Present', count: summary.present, color: '#10B981' },
          { label: 'Absent', count: summary.absent, color: '#EF4444' },
          { label: 'Late', count: summary.late, color: '#F59E0B' },
          { label: 'Pending', count: summary.unmarked, color: '#9CA3AF' },
        ].map((item) => (
          <View key={item.label} style={styles.summaryCard}>
            <Text style={[styles.summaryCount, { color: item.color }]}>{item.count}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Mark All Shortcuts */}
      <View style={styles.markAllRow}>
        <Text style={styles.markAllLabel}>Mark all:</Text>
        <TouchableOpacity
          onPress={() => markAll('present')}
          style={[styles.markAllBtn, { backgroundColor: '#D1FAE5' }]}
        >
          <Text style={{ color: '#10B981', fontWeight: '600', fontSize: 12 }}>Present</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => markAll('absent')}
          style={[styles.markAllBtn, { backgroundColor: '#FEE2E2' }]}
        >
          <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 12 }}>Absent</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => markAll(null)}
          style={[styles.markAllBtn, { backgroundColor: '#F3F4F6' }]}
        >
          <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 12 }}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Student List */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StudentRow student={item} onMark={markOne} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.submitText}>Submit Attendance</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  classTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  dateText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  classSelector: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  classSelectorText: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },
  summaryRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    gap: 8, backgroundColor: 'white',
  },
  summaryCard: {
    flex: 1, alignItems: 'center', padding: 10,
    backgroundColor: '#F9FAFB', borderRadius: 10,
  },
  summaryCount: { fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  markAllRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  markAllLabel: { fontSize: 12, color: '#6B7280', marginRight: 4 },
  markAllBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'white', borderRadius: 10, padding: 12, marginBottom: 6,
  },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rollBadge: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  rollText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  studentName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  statusButtons: { flexDirection: 'row', gap: 6 },
  statusBtn: {
    width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  statusBtnText: { fontSize: 12, fontWeight: '700' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  submitBtn: {
    backgroundColor: '#4F46E5', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitText: { color: 'white', fontWeight: '700', fontSize: 15 },
})
