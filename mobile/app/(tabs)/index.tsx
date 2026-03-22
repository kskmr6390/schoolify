import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

interface StatCardProps {
  label: string
  value: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  )
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name}>Sarah Mitchell 👋</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>SM</Text>
          </View>
        </View>

        {/* School Name */}
        <View style={styles.schoolBadge}>
          <Ionicons name="school" size={14} color="#4F46E5" />
          <Text style={styles.schoolName}>Greenwood High School</Text>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Students" value="472" icon="people" color="#4F46E5" />
          <StatCard label="Attendance" value="87.4%" icon="checkmark-circle" color="#10B981" />
          <StatCard label="Fee Collected" value="₹5.3L" icon="card" color="#F59E0B" />
          <StatCard label="Pending Fees" value="₹35K" icon="warning" color="#EF4444" />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { label: 'Mark Attendance', icon: 'checkmark-circle-outline' as const, color: '#4F46E5' },
            { label: 'Add Student', icon: 'person-add-outline' as const, color: '#10B981' },
            { label: 'Record Payment', icon: 'card-outline' as const, color: '#F59E0B' },
            { label: 'View Reports', icon: 'bar-chart-outline' as const, color: '#8B5CF6' },
          ].map((action) => (
            <TouchableOpacity key={action.label} style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          {[
            { text: 'Grade 10-A attendance marked', time: '9:00 AM', icon: 'checkmark-circle' as const, color: '#10B981' },
            { text: 'Invoice INV-2024-00142 created', time: '8:45 AM', icon: 'document-text' as const, color: '#4F46E5' },
            { text: 'New student: Emma Wilson enrolled', time: '8:30 AM', icon: 'person-add' as const, color: '#F59E0B' },
            { text: 'Fee payment received: ₹15,000', time: 'Yesterday', icon: 'card' as const, color: '#EF4444' },
          ].map((item, i) => (
            <View key={i} style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={16} color={item.color} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{item.text}</Text>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: { fontSize: 14, color: '#6B7280' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  avatar: {
    width: 42, height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: '#4F46E5' },
  schoolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  schoolName: { fontSize: 12, color: '#4F46E5', fontWeight: '500' },
  sectionTitle: {
    fontSize: 15, fontWeight: '600',
    color: '#111827',
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 36, height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 17, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  actionCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 48, height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '500', color: '#374151', textAlign: 'center' },
  activityList: {
    paddingHorizontal: 16,
    marginBottom: 32,
    gap: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
  },
  activityIcon: {
    width: 32, height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityContent: { flex: 1 },
  activityText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  activityTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
})
