import { useState } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

type NotificationType = 'attendance' | 'fee' | 'assignment' | 'announcement' | 'alert'

interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  time: string
  isRead: boolean
}

const TYPE_CONFIG: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  attendance: { icon: 'checkmark-circle', color: '#10B981' },
  fee: { icon: 'card', color: '#F59E0B' },
  assignment: { icon: 'document-text', color: '#4F46E5' },
  announcement: { icon: 'megaphone', color: '#8B5CF6' },
  alert: { icon: 'warning', color: '#EF4444' },
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'attendance',
    title: 'Low Attendance Alert',
    body: 'Student Raj Kumar has attendance below 75%. Current: 68%',
    time: '10 min ago',
    isRead: false,
  },
  {
    id: '2',
    type: 'fee',
    title: 'Payment Received',
    body: 'Fee payment of ₹15,000 received from Priya Sharma (Grade 10-A)',
    time: '1 hour ago',
    isRead: false,
  },
  {
    id: '3',
    type: 'assignment',
    title: 'Assignment Submitted',
    body: '24 students submitted "Chapter 5 Exercises" before the deadline.',
    time: '2 hours ago',
    isRead: true,
  },
  {
    id: '4',
    type: 'announcement',
    title: 'School Holiday',
    body: 'The school will remain closed on March 25th for Holi. Classes resume on March 26th.',
    time: 'Yesterday',
    isRead: true,
  },
  {
    id: '5',
    type: 'alert',
    title: 'Pending Fee Invoices',
    body: '42 students have outstanding fees totalling ₹2,34,000.',
    time: '2 days ago',
    isRead: true,
  },
  {
    id: '6',
    type: 'assignment',
    title: 'New Assignment Posted',
    body: 'Mathematics: "Quadratic Equations Practice Set" due on March 22nd.',
    time: '2 days ago',
    isRead: true,
  },
]

function NotificationItem({
  item,
  onRead,
}: {
  item: Notification
  onRead: (id: string) => void
}) {
  const config = TYPE_CONFIG[item.type]
  return (
    <TouchableOpacity
      style={[styles.notifCard, !item.isRead && styles.unreadCard]}
      onPress={() => onRead(item.id)}
      activeOpacity={0.7}
    >
      {!item.isRead && <View style={styles.unreadDot} />}
      <View style={[styles.notifIcon, { backgroundColor: config.color + '15' }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>
      <View style={styles.notifContent}>
        <Text style={styles.notifTitle}>{item.title}</Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.notifTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const onRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const displayed = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['all', 'unread'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.activeFilterTab]}
            onPress={() => setFilter(f as 'all' | 'unread')}
          >
            <Text style={[styles.filterTabText, filter === f && styles.activeFilterTabText]}>
              {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem item={item} onRead={markAsRead} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  markAllText: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  activeFilterTab: { backgroundColor: '#4F46E5' },
  filterTabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  activeFilterTabText: { color: 'white' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 6,
    position: 'relative',
  },
  unreadCard: { borderLeftWidth: 3, borderLeftColor: '#4F46E5' },
  unreadDot: {
    position: 'absolute', top: 14, right: 14,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5',
  },
  notifIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  notifBody: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  notifTime: { fontSize: 11, color: '#9CA3AF', marginTop: 5 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
})
