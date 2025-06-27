# Tài liệu hệ thống Telegram Proxy Website

## 1. Tổng quan hệ thống

### 1.1 Giới thiệu
Hệ thống Telegram Proxy Website là một ứng dụng web cho phép quản lý và cung cấp các proxy server để kết nối với Telegram. Hệ thống hỗ trợ nhiều loại proxy (MTProto, SOCKS5, HTTP) và cung cấp giao diện quản trị để thêm, sửa, xóa và theo dõi proxy.

### 1.2 Kiến trúc tổng quan
- **Frontend**: Next.js 15 + React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom JWT-based auth system
- **Deployment**: Vercel-ready

### 1.3 Cấu trúc thư mục
\`\`\`
telegram-proxy/
├── app/                          # Next.js App Router
│   ├── admin95/                  # Admin dashboard
│   ├── api/                      # API Routes
│   ├── components/               # Reusable components
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript type definitions
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage
├── lib/                          # Utility libraries
├── scripts/                      # Database scripts
└── package.json                  # Dependencies
\`\`\`

## 2. Database Schema

### 2.1 Bảng `proxies`
\`\`\`sql
CREATE TABLE proxies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  server TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL, 
  description TEXT NOT NULL,
  type TEXT CHECK (type IN ('http', 'socks5', 'mtproto')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

### 2.2 Bảng `user_profiles`
\`\`\`sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT CHECK (role IN ('user', 'admin', 'super_admin')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

### 2.3 Bảng `proxy_usage_stats`
\`\`\`sql
CREATE TABLE proxy_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proxy_id UUID REFERENCES proxies(id),
  user_id UUID NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error_message TEXT
);
\`\`\`

## 3. Hệ thống Authentication

### 3.1 Kiến trúc xác thực
Hệ thống sử dụng custom authentication với JWT tokens. Các tài khoản admin được hardcoded trong code và cũng được lưu trong database.

\`\`\`typescript
// Mô hình AuthService
class AuthService {
  static async verifyAdmin(username: string, password: string): Promise<AuthUser | null>;
  static createSessionToken(user: AuthUser): string;
  static verifySessionToken(token: string): AuthUser | null;
}
\`\`\`

### 3.2 Admin Accounts mặc định
\`\`\`typescript
const ADMIN_ACCOUNTS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    username: "admin",
    password: "admin123456", 
    role: "admin"
  },
  {
    id: "00000000-0000-0000-0000-000000000002", 
    username: "superadmin",
    password: "admin123456",
    role: "super_admin"
  }
]
\`\`\`

### 3.3 Flow đăng nhập
1. User gửi username/password đến `/api/auth/login`
2. Server xác thực với hardcoded admin accounts
3. Nếu không tìm thấy, kiểm tra trong Supabase database
4. Tạo token bằng Base64 encoding
5. Client lưu token vào localStorage
6. Token được sử dụng cho các request tiếp theo

## 4. API Endpoints

### 4.1 Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Đăng nhập admin |
| `/api/auth/verify` | POST | Xác thực token |
| `/api/auth/admin-login` | POST | Admin login (legacy) |
| `/api/auth/create-admin` | POST | Tạo admin account |

### 4.2 Proxy Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/proxies` | GET | Lấy danh sách proxy |
| `/api/random-proxy` | GET | Lấy proxy ngẫu nhiên |
| `/api/proxy/crawl` | POST | Auto-crawl proxies |
| `/api/proxy/parse-text` | POST | Parse proxy từ text |

### 4.3 System
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/system/status` | GET | Trạng thái hệ thống |

## 5. Core Components

### 5.1 Proxy Management
- **ProxyCard**: Hiển thị thông tin proxy với actions
- **ProxyForm**: Form thêm/sửa proxy
- **BulkImportModal**: Modal import hàng loạt
- **ExportModal**: Modal xuất dữ liệu
- **QRModal**: Hiển thị QR code

### 5.2 Authentication
- **AuthProvider**: Context provider cho authentication
- **AuthModal**: Modal đăng nhập/đăng ký
- **AdminLoginForm**: Form đăng nhập admin

### 5.3 Admin Dashboard
- **SystemInfo**: Thông tin hệ thống
- **DatabaseStatus**: Hiển thị trạng thái DB
- **ProxyCrawler**: Auto-crawl interface

## 6. Custom Hooks

### 6.1 useAuth
\`\`\`typescript
function useAuth() {
  // Provides authentication context
  const { user, loading, isAdmin, userRole, signIn, signOut } = useContext(AuthContext);
  return { user, loading, isAdmin, userRole, signIn, signOut };
}
\`\`\`

### 6.2 useSupabaseProxies
\`\`\`typescript
function useSupabaseProxies() {
  // Manages proxies in Supabase
  return {
    proxies,
    loading,
    error,
    addProxy,
    updateProxy,
    deleteProxy,
    bulkImportProxies,
    logProxyUsage,
    refreshProxies
  };
}
\`\`\`

### 6.3 useLocalProxies
\`\`\`typescript
function useLocalProxies() {
  // Manages proxies in localStorage
  return {
    proxies,
    loading,
    error,
    addProxy,
    updateProxy,
    deleteProxy,
    bulkImportProxies,
    refreshProxies
  };
}
\`\`\`

## 7. Auto-Crawl System

### 7.1 ProxyCrawler Class
\`\`\`typescript
class ProxyCrawler {
  // Crawls proxies from various sources
  async crawlAll(): Promise<CrawledProxy[]>;
  async crawlFromUrl(url: string, sourceName: string): Promise<CrawledProxy[]>;
  async crawlFromText(text: string, sourceName: string): Promise<CrawledProxy[]>;
  async validateProxy(proxy: CrawledProxy): Promise<boolean>;
}
\`\`\`

### 7.2 Nguồn crawl mặc định
- GitHub proxy lists
- ProxyScrape API
- Free proxy list APIs
- Custom URL input
- Manual text parsing

## 8. Telegram Integration

### 8.1 URL Formats
- **MTProto**: `tg://proxy?server=...&port=...&secret=...`
- **SOCKS5**: `tg://socks?server=...&port=...&user=...&pass=...`
- **HTTP**: `http://username:password@server:port`

### 8.2 QR Code Generation
Sử dụng thư viện `qrcode.react` để tạo QR code cho mobile.

### 8.3 One-Click Install
Sử dụng URL scheme để mở trực tiếp trong Telegram app.

## 9. Environment Variables

\`\`\`
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication  
JWT_SECRET=your-jwt-secret
ADMIN_SECRET_KEY=your-admin-secret

# Optional
CRON_SECRET=your-cron-secret
TELEGRAM_BOT_TOKEN=your-bot-token
\`\`\`

## 10. Data Flow

### 10.1 Proxy Management Flow
\`\`\`
User Input → ProxyForm → API Route → Supabase → UI Update
     ↓
useSupabaseProxies Hook → Real-time sync → Component Re-render
\`\`\`

### 10.2 Authentication Flow
\`\`\`
Login Form → /api/auth/login → AuthService.verifyAdmin() 
     ↓
Token Creation → localStorage → AuthProvider → Protected Routes
\`\`\`

### 10.3 Auto-Crawl Flow
\`\`\`
ProxyCrawler → External APIs → Parse & Validate → Supabase Insert
     ↓
Real-time Update → UI Refresh → User Notification
\`\`\`

## 11. Roadmap & Extensibility

### 11.1 Planned Features
1. **User Registration System**: Full user management
2. **Proxy Health Monitoring**: Real-time status checks  
3. **Analytics Dashboard**: Usage statistics & charts
4. **API Rate Limiting**: Prevent abuse
5. **Telegram Bot Integration**: Bot commands
6. **Multi-language Support**: i18n implementation
7. **Proxy Testing**: Automated connectivity tests
8. **Backup/Restore**: Data backup functionality

### 11.2 Known Limitations
1. **No real user registration**: Only admin accounts
2. **Basic proxy validation**: Limited connectivity testing
3. **No rate limiting**: API endpoints unprotected
4. **Hardcoded admin credentials**: Should be in database
5. **No email notifications**: Manual user management

## 12. Technical Reference

### 12.1 Proxy Types
| Type | Description | URL Format |
|------|-------------|------------|
| MTProto | Telegram-specific protocol | `tg://proxy?server=...&port=...&secret=...` |
| SOCKS5 | SOCKS5 proxy protocol | `tg://socks?server=...&port=...&user=...&pass=...` |
| HTTP | Standard HTTP proxy | `http://username:password@server:port` |

### 12.2 User Roles
| Role | Permissions |
|------|-------------|
| user | View and use proxies |
| admin | Manage proxies, view system info |
| super_admin | Full system access, manage users |

### 12.3 Proxy Validation Rules
- Server must be valid IP or domain
- Port must be between 1-65535
- MTProto secret must be at least 32 hex characters
- Username/password required for HTTP/SOCKS5
\`\`\`

## 13. Deployment Guide

### 13.1 Local Development
\`\`\`bash
# Clone repository
git clone https://github.com/your-repo/telegram-proxy.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
\`\`\`

### 13.2 Vercel Deployment
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with default settings
4. Set up custom domain if needed

## 14. Security Considerations

### 14.1 Authentication Security
- Token-based auth with expiration
- Role-based access control
- Protected admin routes

### 14.2 Data Security
- Input validation for all forms
- SQL injection protection via Supabase
- XSS prevention with React
- CORS handling with Next.js API routes

## 15. Performance Optimizations

### 15.1 Frontend
- React.memo for expensive components
- useCallback/useMemo for function memoization
- Lazy loading for heavy components
- Pagination for large datasets

### 15.2 Backend
- Database indexing on search fields
- Query optimization with Supabase
- Browser caching for static assets
- Error boundaries for graceful failures
\`\`\`



Tôi đã tạo một tài liệu tổng quan về hệ thống Telegram Proxy Website tại đường dẫn `/hoantn/system-documentation.md`. Tài liệu này được thiết kế với cấu trúc logic và dễ hiểu để cả con người và AI đều có thể đọc và phân tích.

Tài liệu bao gồm:

1. **Tổng quan hệ thống** - Giới thiệu và kiến trúc tổng thể
2. **Database Schema** - Cấu trúc các bảng dữ liệu
3. **Hệ thống Authentication** - Cơ chế xác thực và quản lý người dùng
4. **API Endpoints** - Danh sách các API và chức năng
5. **Core Components** - Các thành phần UI chính
6. **Custom Hooks** - Các hook React tùy chỉnh
7. **Auto-Crawl System** - Hệ thống tự động thu thập proxy
8. **Telegram Integration** - Tích hợp với Telegram
9. **Environment Variables** - Biến môi trường cần thiết
10. **Data Flow** - Luồng dữ liệu trong hệ thống
11. **Roadmap & Extensibility** - Kế hoạch phát triển
12. **Technical Reference** - Thông tin kỹ thuật chi tiết
13. **Deployment Guide** - Hướng dẫn triển khai
14. **Security Considerations** - Các vấn đề bảo mật
15. **Performance Optimizations** - Tối ưu hiệu suất

Tài liệu được định dạng bằng Markdown với các tiêu đề, bảng, code blocks và danh sách để dễ dàng đọc và phân tích. Mỗi phần đều có mô tả chi tiết và ví dụ code khi cần thiết.

Với tài liệu này, các AI khác sẽ có thể hiểu rõ về cấu trúc, chức năng và cách hoạt động của hệ thống Telegram Proxy Website, giúp cho việc phát triển và bảo trì trong tương lai trở nên dễ dàng hơn.
