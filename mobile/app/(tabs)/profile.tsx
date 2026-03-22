import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  subtitle?: string
  color?: string
  onPress?: () => void
  badge?: string
}

function MenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuCard}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, index < items.length - 1 && styles.menuItemBorder]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: (item.color || '#4F46E5') + '15' }]}>
              <Ionicons name={item.icon} size={18} color={item.color || '#4F46E5'} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
            </View>
            <View style={styles.menuRight}>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export default function ProfileScreen() {
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => {} },
      ],
    )
  }

  const accountItems: MenuItem[] = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      subtitle: 'Update your personal information',
    },
    {
      icon: 'lock-closed-outline',
      label: 'Change Password',
      subtitle: 'Update your password',
    },
    {
      icon: 'notifications-outline',
      label: 'Notification Preferences',
      subtitle: 'Email, SMS, push notifications',
      badge: '3',
    },
  ]

  const schoolItems: MenuItem[] = [
    {
      icon: 'school-outline',
      label: 'Greenwood High School',
      subtitle: 'greenwood-high.schoolify.com',
      color: '#10B981',
    },
    {
      icon: 'people-outline',
      label: 'My Classes',
      subtitle: 'Grade 10-A, Grade 10-B, Grade 11-A',
      color: '#8B5CF6',
    },
  ]

  const appItems: MenuItem[] = [
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
    },
    {
      icon: 'document-text-outline',
      label: 'Privacy Policy',
    },
    {
      icon: 'information-circle-outline',
      label: 'App Version',
      subtitle: '1.0.0 (build 42)',
    },
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>SM</Text>
          </View>
          <Text style={styles.profileName}>Sarah Mitchell</Text>
          <Text style={styles.profileRole}>Administrator</Text>
          <View style={styles.profileBadge}>
            <Ionicons name="school" size={12} color="#4F46E5" />
            <Text style={styles.profileBadgeText}>Greenwood High School</Text>
          </View>
          <Text style={styles.profileEmail}>sarah@greenwood-high.edu</Text>
        </View>

        {/* Stats Strip */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Students', value: '472' },
            { label: 'Teachers', value: '32' },
            { label: 'Classes', value: '18' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <MenuSection title="Account" items={accountItems} />
        <MenuSection title="School" items={schoolItems} />
        <MenuSection title="App" items={appItems} />

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  profileCard: {
    alignItems: 'center', paddingTop: 28, paddingBottom: 20,
    backgroundColor: 'white',
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#4F46E5' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  profileRole: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  profileBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8,
    backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  profileBadgeText: { fontSize: 12, color: '#4F46E5', fontWeight: '500' },
  profileEmail: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
  statsStrip: {
    flexDirection: 'row', backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingVertical: 14,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuCard: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '500', color: '#111827' },
  menuSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 32,
  },
  logoutText: { color: '#EF4444', fontWeight: '600', fontSize: 15 },
})
