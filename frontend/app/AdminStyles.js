import { StyleSheet } from 'react-native';

const adminStyles = StyleSheet.create({
  // Admin Panel Styles
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#2c3e50',
  },
  adminHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  adminContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  adminWelcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  adminTabSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  adminTab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  adminTabActive: {
    backgroundColor: '#3498db',
  },
  adminTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  adminTabTextActive: {
    color: '#fff',
  },
  adminContent: {
    flex: 1,
  },
  adminSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  // User Card Styles
  adminUserCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 3,
  },
  adminUserInfo: {
    flex: 1,
  },
  adminUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  adminUserEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  adminUserBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  adminBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  adminBadgeAdmin: {
    backgroundColor: '#e74c3c',
  },
  adminBadgeMover: {
    backgroundColor: '#f39c12',
  },
  adminBadgeCustomer: {
    backgroundColor: '#3498db',
  },
  adminBadgeVerified: {
    backgroundColor: '#27ae60',
  },
  adminBadgePending: {
    backgroundColor: '#f39c12',
  },
  adminBadgeApproved: {
    backgroundColor: '#27ae60',
  },
  adminBadgeCompleted: {
    backgroundColor: '#95a5a6',
  },
  // Request Card Styles
  adminRequestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 3,
  },
  adminRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adminRequestCustomer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  adminRequestRoute: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 4,
    fontWeight: '600',
  },
  adminRequestDate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  adminRequestDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
});

export { adminStyles };
export default adminStyles;