#!/usr/bin/env python3
"""
Backend API Test Suite for Nakliyat Platform
Tests authentication, moving requests, bidding system, and admin endpoints
"""

import requests
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing backend at: {API_BASE}")

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def log_pass(self, test_name):
        print(f"✅ PASS: {test_name}")
        self.passed += 1
    
    def log_fail(self, test_name, error):
        print(f"❌ FAIL: {test_name} - {error}")
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")

# Global test data storage
test_data = {
    'customer_token': None,
    'mover_token': None,
    'admin_token': None,
    'customer_id': None,
    'mover_id': None,
    'admin_id': None,
    'moving_request_id': None,
    'bid_id': None,
    'customer_email_code': None,
    'customer_phone_code': None,
    'mover_email_code': None,
    'mover_phone_code': None,
    'admin_email_code': None,
    'admin_phone_code': None
}

results = TestResults()

def test_user_registration():
    """Test user registration for different user types"""
    print("\n🔧 Testing User Registration...")
    
    # Test customer registration
    try:
        customer_data = {
            "name": "Ahmet Yılmaz",
            "email": "ahmet.yilmaz@example.com",
            "phone": "+905551234567",
            "user_type": "customer",
            "password": "securepass123"
        }
        
        response = requests.post(f"{API_BASE}/register", json=customer_data)
        if response.status_code == 200:
            data = response.json()
            test_data['customer_email_code'] = data.get('email_code')
            test_data['customer_phone_code'] = data.get('phone_code')
            results.log_pass("Customer registration")
        else:
            results.log_fail("Customer registration", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Customer registration", str(e))
    
    # Test mover registration
    try:
        mover_data = {
            "name": "Mehmet Taşıyıcı",
            "email": "mehmet.tasiyici@example.com",
            "phone": "+905559876543",
            "user_type": "mover",
            "password": "moverpass123",
            "company_name": "Güvenli Nakliyat Ltd."
        }
        
        response = requests.post(f"{API_BASE}/register", json=mover_data)
        if response.status_code == 200:
            data = response.json()
            test_data['mover_email_code'] = data.get('email_code')
            test_data['mover_phone_code'] = data.get('phone_code')
            results.log_pass("Mover registration")
        else:
            results.log_fail("Mover registration", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Mover registration", str(e))
    
    # Test admin registration
    try:
        admin_data = {
            "name": "Admin User",
            "email": "admin@nakliyat.com",
            "phone": "+905551111111",
            "user_type": "admin",
            "password": "adminpass123"
        }
        
        response = requests.post(f"{API_BASE}/register", json=admin_data)
        if response.status_code == 200:
            data = response.json()
            test_data['admin_email_code'] = data.get('email_code')
            test_data['admin_phone_code'] = data.get('phone_code')
            results.log_pass("Admin registration")
        else:
            results.log_fail("Admin registration", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Admin registration", str(e))

def test_email_phone_verification():
    """Test email and phone verification"""
    print("\n📧 Testing Email and Phone Verification...")
    
    if not test_data['customer_email_code'] or not test_data['customer_phone_code']:
        results.log_fail("Verification setup", "No verification codes available from registration")
        return
    
    # Test email verification
    try:
        verify_data = {
            "email": "ahmet.yilmaz@example.com",
            "verification_code": test_data['customer_email_code'],
            "verification_type": "email"
        }
        
        response = requests.post(f"{API_BASE}/verify", json=verify_data)
        if response.status_code == 200:
            results.log_pass("Email verification")
        else:
            results.log_fail("Email verification", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Email verification", str(e))
    
    # Test phone verification
    try:
        verify_data = {
            "email": "ahmet.yilmaz@example.com",
            "verification_code": test_data['customer_phone_code'],
            "verification_type": "phone"
        }
        
        response = requests.post(f"{API_BASE}/verify", json=verify_data)
        if response.status_code == 200:
            results.log_pass("Phone verification")
        else:
            results.log_fail("Phone verification", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Phone verification", str(e))
    
    # Verify admin email and phone for later tests
    if test_data['admin_email_code'] and test_data['admin_phone_code']:
        try:
            verify_data = {
                "email": "admin@nakliyat.com",
                "verification_code": test_data['admin_email_code'],
                "verification_type": "email"
            }
            requests.post(f"{API_BASE}/verify", json=verify_data)
            
            verify_data["verification_code"] = test_data['admin_phone_code']
            verify_data["verification_type"] = "phone"
            requests.post(f"{API_BASE}/verify", json=verify_data)
        except:
            pass  # Don't fail the test if admin verification fails
    
    # Verify mover email and phone for later tests
    if test_data['mover_email_code'] and test_data['mover_phone_code']:
        try:
            verify_data = {
                "email": "mehmet.tasiyici@example.com",
                "verification_code": test_data['mover_email_code'],
                "verification_type": "email"
            }
            requests.post(f"{API_BASE}/verify", json=verify_data)
            
            verify_data["verification_code"] = test_data['mover_phone_code']
            verify_data["verification_type"] = "phone"
            requests.post(f"{API_BASE}/verify", json=verify_data)
        except:
            pass  # Don't fail the test if mover verification fails

def test_login_and_jwt():
    """Test login functionality and JWT token generation"""
    print("\n🔐 Testing Login and JWT Token Generation...")
    
    # Test customer login
    try:
        login_data = {
            "email": "ahmet.yilmaz@example.com",
            "password": "securepass123"
        }
        
        response = requests.post(f"{API_BASE}/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            test_data['customer_token'] = data.get('access_token')
            results.log_pass("Customer login")
        else:
            results.log_fail("Customer login", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Customer login", str(e))
    
    # Test admin login
    try:
        login_data = {
            "email": "admin@nakliyat.com",
            "password": "adminpass123"
        }
        
        response = requests.post(f"{API_BASE}/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            test_data['admin_token'] = data.get('access_token')
            results.log_pass("Admin login")
        else:
            results.log_fail("Admin login", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Admin login", str(e))

def test_auth_protection():
    """Test authentication protection on protected endpoints"""
    print("\n🛡️ Testing Authentication Protection...")
    
    # Test accessing protected endpoint without token
    try:
        response = requests.get(f"{API_BASE}/moving-requests")
        if response.status_code == 403:
            results.log_pass("Auth protection - no token")
        else:
            results.log_fail("Auth protection - no token", f"Expected 403, got {response.status_code}")
    except Exception as e:
        results.log_fail("Auth protection - no token", str(e))
    
    # Test accessing protected endpoint with invalid token
    try:
        headers = {"Authorization": "Bearer invalid_token"}
        response = requests.get(f"{API_BASE}/moving-requests", headers=headers)
        if response.status_code == 401:
            results.log_pass("Auth protection - invalid token")
        else:
            results.log_fail("Auth protection - invalid token", f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.log_fail("Auth protection - invalid token", str(e))

def test_moving_request_creation():
    """Test moving request creation by customers"""
    print("\n📦 Testing Moving Request Creation...")
    
    if not test_data['customer_token']:
        results.log_fail("Moving request creation", "No customer token available")
        return
    
    try:
        headers = {"Authorization": f"Bearer {test_data['customer_token']}"}
        moving_date = (datetime.now() + timedelta(days=7)).isoformat()
        
        request_data = {
            "from_location": "Kadıköy, İstanbul",
            "to_location": "Beşiktaş, İstanbul",
            "from_floor": 3,
            "to_floor": 2,
            "has_elevator_from": True,
            "has_elevator_to": False,
            "needs_mobile_elevator": True,
            "truck_distance": "Kamyon binaya 50 metre mesafede park edebilir",
            "packing_service": True,
            "moving_date": moving_date,
            "description": "2+1 daire taşınması, beyaz eşyalar dahil"
        }
        
        response = requests.post(f"{API_BASE}/moving-requests", json=request_data, headers=headers)
        if response.status_code == 200:
            data = response.json()
            test_data['moving_request_id'] = data.get('id')
            results.log_pass("Moving request creation")
        else:
            results.log_fail("Moving request creation", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Moving request creation", str(e))

def test_moving_request_privacy():
    """Test moving request viewing with privacy controls"""
    print("\n👁️ Testing Moving Request Privacy Controls...")
    
    if not test_data['customer_token']:
        results.log_fail("Moving request privacy", "No customer token available")
        return
    
    # Test customer viewing their own requests
    try:
        headers = {"Authorization": f"Bearer {test_data['customer_token']}"}
        response = requests.get(f"{API_BASE}/moving-requests", headers=headers)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                results.log_pass("Customer viewing own requests")
            else:
                results.log_fail("Customer viewing own requests", "No requests returned")
        else:
            results.log_fail("Customer viewing own requests", f"Status: {response.status_code}")
    except Exception as e:
        results.log_fail("Customer viewing own requests", str(e))

def test_mover_approval_system():
    """Test mover approval system"""
    print("\n✅ Testing Mover Approval System...")
    
    if not test_data['admin_token']:
        results.log_fail("Mover approval", "No admin token available")
        return
    
    # First, get all users to find the mover
    try:
        headers = {"Authorization": f"Bearer {test_data['admin_token']}"}
        response = requests.get(f"{API_BASE}/admin/users", headers=headers)
        if response.status_code == 200:
            users = response.json()
            mover_user = None
            for user in users:
                if user.get('user_type') == 'mover' and user.get('email') == 'mehmet.tasiyici@example.com':
                    mover_user = user
                    test_data['mover_id'] = user.get('id')
                    break
            
            if mover_user:
                results.log_pass("Admin viewing users")
                
                # Test mover approval
                if test_data['mover_id']:
                    response = requests.post(f"{API_BASE}/admin/approve-mover/{test_data['mover_id']}", headers=headers)
                    if response.status_code == 200:
                        results.log_pass("Mover approval")
                    else:
                        results.log_fail("Mover approval", f"Status: {response.status_code}")
            else:
                results.log_fail("Admin viewing users", "Mover user not found")
        else:
            results.log_fail("Admin viewing users", f"Status: {response.status_code}")
    except Exception as e:
        results.log_fail("Mover approval", str(e))

def test_mover_login_after_approval():
    """Test mover login after admin approval"""
    print("\n🔓 Testing Mover Login After Approval...")
    
    # Now try to login
    try:
        login_data = {
            "email": "mehmet.tasiyici@example.com",
            "password": "moverpass123"
        }
        
        response = requests.post(f"{API_BASE}/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            test_data['mover_token'] = data.get('access_token')
            results.log_pass("Mover login after approval")
        else:
            results.log_fail("Mover login after approval", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Mover login after approval", str(e))

def test_bid_creation():
    """Test bid creation by movers"""
    print("\n💰 Testing Bid Creation...")
    
    if not test_data['mover_token'] or not test_data['moving_request_id']:
        results.log_fail("Bid creation", "Missing mover token or moving request ID")
        return
    
    try:
        headers = {"Authorization": f"Bearer {test_data['mover_token']}"}
        bid_data = {
            "price": 2500.00,
            "message": "Profesyonel ekip ile güvenli taşıma hizmeti. Sigortalı ve garantili."
        }
        
        response = requests.post(f"{API_BASE}/moving-requests/{test_data['moving_request_id']}/bids", 
                               json=bid_data, headers=headers)
        if response.status_code == 200:
            data = response.json()
            test_data['bid_id'] = data.get('id')
            results.log_pass("Bid creation")
        else:
            results.log_fail("Bid creation", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Bid creation", str(e))

def test_bid_viewing_permissions():
    """Test bid viewing permissions"""
    print("\n👀 Testing Bid Viewing Permissions...")
    
    if not test_data['customer_token'] or not test_data['moving_request_id']:
        results.log_fail("Bid viewing", "Missing customer token or moving request ID")
        return
    
    try:
        headers = {"Authorization": f"Bearer {test_data['customer_token']}"}
        response = requests.get(f"{API_BASE}/moving-requests/{test_data['moving_request_id']}/bids", headers=headers)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                results.log_pass("Customer viewing bids")
            else:
                results.log_fail("Customer viewing bids", "Invalid response format")
        else:
            results.log_fail("Customer viewing bids", f"Status: {response.status_code}")
    except Exception as e:
        results.log_fail("Customer viewing bids", str(e))

def test_bid_acceptance():
    """Test bid acceptance by customers"""
    print("\n🤝 Testing Bid Acceptance...")
    
    if not test_data['customer_token'] or not test_data['bid_id']:
        results.log_fail("Bid acceptance", "Missing customer token or bid ID")
        return
    
    try:
        headers = {"Authorization": f"Bearer {test_data['customer_token']}"}
        response = requests.post(f"{API_BASE}/bids/{test_data['bid_id']}/accept", headers=headers)
        if response.status_code == 200:
            results.log_pass("Bid acceptance")
        else:
            results.log_fail("Bid acceptance", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Bid acceptance", str(e))

def test_error_handling():
    """Test various error conditions"""
    print("\n⚠️ Testing Error Handling...")
    
    # Test duplicate registration
    try:
        duplicate_data = {
            "name": "Ahmet Yılmaz",
            "email": "ahmet.yilmaz@example.com",
            "phone": "+905551234567",
            "user_type": "customer",
            "password": "securepass123"
        }
        
        response = requests.post(f"{API_BASE}/register", json=duplicate_data)
        if response.status_code == 400:
            results.log_pass("Duplicate registration prevention")
        else:
            results.log_fail("Duplicate registration prevention", f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.log_fail("Duplicate registration prevention", str(e))
    
    # Test invalid login
    try:
        login_data = {
            "email": "nonexistent@example.com",
            "password": "wrongpass"
        }
        
        response = requests.post(f"{API_BASE}/login", json=login_data)
        if response.status_code == 401:
            results.log_pass("Invalid login rejection")
        else:
            results.log_fail("Invalid login rejection", f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.log_fail("Invalid login rejection", str(e))

def test_admin_login_specific():
    """Test specific admin user kmrfrt@gmail.com login"""
    print("\n🔐 Testing Specific Admin Login (kmrfrt@gmail.com)...")
    
    try:
        login_data = {
            "email": "kmrfrt@gmail.com",
            "password": "Frt19o7"
        }
        
        response = requests.post(f"{API_BASE}/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            test_data['admin_token'] = data.get('access_token')
            results.log_pass("Admin kmrfrt@gmail.com login")
        else:
            results.log_fail("Admin kmrfrt@gmail.com login", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Admin kmrfrt@gmail.com login", str(e))

def test_admin_users_endpoint():
    """Test admin users listing endpoint"""
    print("\n👥 Testing Admin Users Endpoint...")
    
    if not test_data['admin_token']:
        results.log_fail("Admin users endpoint", "No admin token available")
        return
    
    try:
        headers = {"Authorization": f"Bearer {test_data['admin_token']}"}
        response = requests.get(f"{API_BASE}/admin/users", headers=headers)
        if response.status_code == 200:
            users = response.json()
            if isinstance(users, list):
                print(f"   Found {len(users)} users in system")
                
                # Check for test data users
                user_types = {}
                for user in users:
                    user_type = user.get('user_type', 'unknown')
                    user_types[user_type] = user_types.get(user_type, 0) + 1
                
                print(f"   User breakdown: {user_types}")
                
                # Verify we have expected test data
                if user_types.get('customer', 0) >= 5 and user_types.get('mover', 0) >= 3:
                    results.log_pass("Admin users endpoint with test data")
                else:
                    results.log_fail("Admin users endpoint", f"Expected at least 5 customers and 3 movers, got {user_types}")
            else:
                results.log_fail("Admin users endpoint", "Invalid response format")
        else:
            results.log_fail("Admin users endpoint", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Admin users endpoint", str(e))

def test_admin_requests_endpoint():
    """Test admin viewing all moving requests"""
    print("\n📋 Testing Admin Moving Requests Endpoint...")
    
    if not test_data['admin_token']:
        results.log_fail("Admin requests endpoint", "No admin token available")
        return
    
    try:
        headers = {"Authorization": f"Bearer {test_data['admin_token']}"}
        response = requests.get(f"{API_BASE}/moving-requests", headers=headers)
        if response.status_code == 200:
            requests_data = response.json()
            if isinstance(requests_data, list):
                print(f"   Found {len(requests_data)} moving requests in system")
                
                # Verify we have expected test data (should be at least 5 requests)
                if len(requests_data) >= 5:
                    results.log_pass("Admin requests endpoint with test data")
                    
                    # Check request details
                    for req in requests_data[:3]:  # Show first 3 requests
                        print(f"   Request: {req.get('from_location')} → {req.get('to_location')} (Status: {req.get('status')})")
                else:
                    results.log_fail("Admin requests endpoint", f"Expected at least 5 requests, got {len(requests_data)}")
            else:
                results.log_fail("Admin requests endpoint", "Invalid response format")
        else:
            results.log_fail("Admin requests endpoint", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Admin requests endpoint", str(e))

def test_test_data_creation():
    """Test the test data creation endpoint"""
    print("\n🏗️ Testing Test Data Creation Endpoint...")
    
    try:
        response = requests.post(f"{API_BASE}/admin/create-test-data")
        if response.status_code == 200:
            data = response.json()
            print(f"   Test data creation response: {data.get('message', 'Success')}")
            if 'created' in data:
                created = data['created']
                print(f"   Created: {created}")
            results.log_pass("Test data creation endpoint")
        else:
            results.log_fail("Test data creation endpoint", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.log_fail("Test data creation endpoint", str(e))

def test_admin_panel_data_flow():
    """Test complete admin panel data flow"""
    print("\n🎛️ Testing Complete Admin Panel Data Flow...")
    
    if not test_data['admin_token']:
        results.log_fail("Admin panel data flow", "No admin token available")
        return
    
    try:
        headers = {"Authorization": f"Bearer {test_data['admin_token']}"}
        
        # Get users count
        users_response = requests.get(f"{API_BASE}/admin/users", headers=headers)
        users_count = len(users_response.json()) if users_response.status_code == 200 else 0
        
        # Get requests count
        requests_response = requests.get(f"{API_BASE}/moving-requests", headers=headers)
        requests_count = len(requests_response.json()) if requests_response.status_code == 200 else 0
        
        print(f"   Admin panel summary: {users_count} users, {requests_count} requests")
        
        if users_count > 0 and requests_count > 0:
            results.log_pass("Admin panel data flow")
        else:
            results.log_fail("Admin panel data flow", f"Insufficient data: {users_count} users, {requests_count} requests")
            
    except Exception as e:
        results.log_fail("Admin panel data flow", str(e))

def run_all_tests():
    """Run all backend tests in sequence"""
    print("🚀 Starting Nakliyat Platform Backend API Tests")
    print(f"Backend URL: {API_BASE}")
    
    # Test data creation first
    test_test_data_creation()
    
    # Specific admin functionality tests
    test_admin_login_specific()
    test_admin_users_endpoint()
    test_admin_requests_endpoint()
    test_admin_panel_data_flow()
    
    # Authentication System Tests
    test_user_registration()
    test_email_phone_verification()
    test_login_and_jwt()
    test_auth_protection()
    
    # Admin System Tests
    test_mover_approval_system()
    test_mover_login_after_approval()
    
    # Moving Request Tests
    test_moving_request_creation()
    test_moving_request_privacy()
    
    # Bid Management Tests
    test_bid_creation()
    test_bid_viewing_permissions()
    test_bid_acceptance()
    
    # Error Handling Tests
    test_error_handling()
    
    # Print final results
    results.summary()
    
    return results

if __name__ == "__main__":
    test_results = run_all_tests()