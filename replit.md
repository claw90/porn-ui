# Chris' Secret Stash

## Overview

This is a comprehensive NSFW/adult content management system with advanced face recognition capabilities. The application serves as Chris' private adult content collection manager for organizing, analyzing, and managing gay adult video content. It features sophisticated face detection and matching across video libraries, vault organization systems, and detailed reporting capabilities specifically designed for adult content curation and analysis with a focus on gay content.

## User Preferences

Preferred communication style: Simple, everyday language.
Target audience: Gay/LGBT community, masculine preferences for content and design.
Content focus: Gay adult content with masculine aesthetic and themes.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server concerns:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL
- **File Handling**: Multer for multipart file uploads
- **Development**: Hot module replacement via Vite integration

### Data Storage
- **Primary Database**: PostgreSQL (configured via Neon serverless) - ACTIVE
- **File Storage**: Local filesystem for uploaded videos and face images
- **ORM**: Drizzle ORM with full database integration
- **Storage Implementation**: DatabaseStorage class replacing in-memory storage

## Key Components

### Database Schema
- **Users Table**: Basic authentication (username, password)
- **Analyses Table**: Core analysis records with video/face paths, processing parameters, results, and metadata
- **Analysis Matches**: JSON structure storing frame numbers, timestamps, confidence scores, and thumbnail paths

### File Upload System
- Separate directories for videos (`uploads/videos`) and face images (`uploads/faces`)
- File size limits (500MB for videos)
- Type validation for video and image formats
- Unique filename generation to prevent conflicts

### Face Recognition Pipeline
- Python scripts for actual face processing (`face_recognition_scripts/`)
- Configurable tolerance levels and frame skip rates
- Optional thumbnail generation for matches
- Progress tracking and status updates

### API Endpoints
- `POST /api/analyses` - Create new analysis with file uploads
- `GET /api/analyses/:id` - Retrieve analysis status and results
- `GET /api/analyses/recent/:limit` - List recent analyses
- `GET /api/analyses/:id/report` - Download PDF reports

## Data Flow

1. **Upload Phase**: User uploads video file and target face image through drag-and-drop interface
2. **Configuration**: User sets analysis parameters (tolerance, frame skip, thumbnail options)
3. **Processing**: Backend spawns Python script to perform face recognition analysis
4. **Storage**: Results stored in database with file references and match metadata
5. **Reporting**: PDF reports generated and made available for download
6. **Real-time Updates**: Frontend polls for status updates during processing

## External Dependencies

### Core Libraries
- **face_recognition**: Python library for face detection and matching
- **OpenCV**: Video processing and frame extraction
- **Drizzle ORM**: Type-safe database operations
- **TanStack Query**: Server state synchronization
- **Radix UI**: Accessible component primitives

### Development Tools
- **TypeScript**: Type safety across the stack
- **Vite**: Fast development server and build tool
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Fast bundling for production

### Database
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle Kit**: Database migrations and schema management

## Deployment Strategy

The application is designed for containerized deployment with the following considerations:

### Build Process
- Frontend builds to static assets via Vite
- Backend bundles to single ESM file via ESBuild
- Shared schema ensures type consistency

### Environment Configuration
- Database URL required for PostgreSQL connection
- File upload directories created automatically
- Development vs production mode detection

### External Requirements
- Python runtime with face_recognition library
- OpenCV installation for video processing
- Sufficient disk space for video file storage
- PostgreSQL database (local or hosted)

The architecture prioritizes developer experience with hot reloading, type safety, and modern tooling while maintaining production readiness through proper error handling, file management, and scalable database design.

## Recent Changes

### January 27, 2025 - Video URL Storage System
- **Added comprehensive video URL storage functionality**
  - Updated database schema with `videoUrl` and `isExternal` fields
  - Created API endpoint `/api/videos/url` for storing external video URLs
  - Built VideoUrlForm component with URL validation, metadata fields, and tag management
  - Integrated URL form into Library page as "Add URL" tab
  - Added visual indicators for external videos (link icons)
  - Implemented automatic title extraction from URLs

### January 27, 2025 - Bulk URL Import Feature
- **Created advanced bulk import system**
  - Built BulkUrlImport component with smart URL detection
  - Added real-time progress tracking during import
  - Supports unlimited video platforms and websites
  - Batch processing with 50 URL limit per import
  - Detailed success/failure reporting for each URL
  - Automatic duplicate detection and URL cleaning
  - Universal compatibility with any video hosting platform

### January 27, 2025 - Personalized Video Recommendation Algorithm
- **Implemented comprehensive AI recommendation system**
  - Extended database schema with user preferences, viewing history, and recommendation cache
  - Created sophisticated recommendation engine with multiple algorithms:
    - Collaborative filtering (similar user preferences)
    - Content-based filtering (video attributes matching)
    - Trending algorithm (recent popularity analysis)
    - Hybrid approach (combining all methods with weighted scoring)
  - Built RecommendationSection component with algorithm selection tabs
  - Added UserPreferences component for managing blocked content and preferences
  - Created dedicated Recommendations page showcasing the full system
  - Integrated real-time interaction tracking for continuous learning
  - Added API endpoints for recommendations, preferences, and interaction recording
  - Maintains masculine dark theme with orange accents throughout
  - Professional algorithm confidence scoring and reasoning display

### January 28, 2025 - OneTab Chrome Extension Integration
- **Created OneTab URL import functionality**
  - Built OneTabImport component with intelligent URL parsing
  - Supports direct paste from OneTab chrome extension export
  - Automatic title extraction and URL validation
  - Batch processing with progress tracking and error handling
  - Added OneTab Import tab to Library page with full integration
  - Professional interface matching existing design aesthetic

### January 28, 2025 - Enhanced Bulk Import System
- **Removed Stash and OneTab import features per user request**
  - Streamlined Library interface to focus on primary bulk import method
  - Enhanced bulk import capacity from 50 to 500 URLs per batch
  - Optimized UI layout for 99% desktop usage
  - Removed unnecessary import tabs for cleaner interface
  - Fixed API endpoint compatibility issues
  - Updated all documentation to reflect 500 URL limit

### January 28, 2025 - Desktop Layout Optimization
- **Optimized dashboard and interface for desktop viewing**
  - Reduced spacing and padding throughout dashboard
  - Compressed header sections to fit more content on screen
  - Adjusted grid gaps for better desktop utilization
  - Ensured all content fits within standard desktop viewport
  - Maintained masculine dark theme with professional aesthetics

### January 28, 2025 - Real-Time Face Recognition Integration
- **Implemented real-time face recognition during video playback**
  - Created VideoPlayer component with custom controls and AI integration
  - Built RealTimeFaceRecognition component with live analysis capabilities
  - Added "Real-time AI" toggle button for enabling face recognition during video playback
  - Implemented confidence threshold controls and live match display
  - Created API endpoint `/api/face-recognition/realtime` for frame analysis
  - Integrated video player into Home page with imported video URLs
  - Fixed video display system to show bulk imported URLs (350+ videos successfully imported)
  - Added video selection functionality from library sidebar

### January 28, 2025 - Embedded Video Player with Thumbnails
- **Created fully functional embedded video player system**
  - Built EmbeddedVideoPlayer with in-app video playback capabilities
  - Implemented thumbnail extraction API that pulls real preview images from video pages
  - Added multiple embedding methods with automatic fallback system
  - Created click-to-play interface that embeds videos directly in the app
  - Generated SVG thumbnails as fallbacks for external videos
  - Removed Quick Actions section from main page per user request
  - Updated layout to full-width video player for better viewing experience
  - Successfully displaying thumbnails and embedding videos from external platforms

### January 28, 2025 - Authentication-Aware Video System
- **Implemented session-aware video playback and thumbnail generation**
  - Created AuthenticatedVideoPlayer component for handling login-protected videos
  - Built SessionAwareThumbnail component for accessing thumbnails with user sessions
  - Added iframe embedding with user session maintenance for thisvid.com
  - Implemented fallback SVG thumbnails when authentication fails
  - Removed excessive debug notifications and made UI cleaner
  - Added session protection indicators for authenticated content
  - Fixed "all methods failed" video playback issues for external platforms
  - Enhanced video titles extraction from URLs to show meaningful names
  - Optimized for thisvid.com login requirements and session persistence

### January 28, 2025 - Professional Thumbnail System Integration
- **Created comprehensive thumbnail API and display system**
  - Built `/api/videos/:id/thumbnail` endpoint for dynamic thumbnail generation
  - Implemented brand-aware SVG thumbnails with site-specific styling (ThisVid, PornHub, XVideos)
  - Added professional gradient backgrounds and proper branding for external videos
  - Integrated thumbnail system into Video Library with proper error handling
  - Enhanced both list and grid view thumbnail displays
  - Added caching headers for optimal performance
  - Successfully displaying thumbnails for 50+ imported video URLs
  - Properly integrated thumbnail functionality into Content Management > Video Library

### January 28, 2025 - Real Video Thumbnail Extraction System
- **Implemented authentic thumbnail extraction from video platforms**
  - Created web scraping system to extract real video thumbnails from platform pages
  - Added Open Graph meta tag parsing for ThisVid, PornHub, XVideos, and other sites
  - Built thumbnail proxy system to serve external images through the application
  - Implemented automatic fallback to branded placeholders when real thumbnails unavailable
  - Added proper error handling and user agent spoofing for platform compatibility
  - Successfully extracting and displaying actual video preview images
  - Enhanced user experience with authentic video thumbnails instead of generic placeholders

### January 29, 2025 - AI-Powered Video Similarity System
- **Created comprehensive AI video tagging and similarity recommendations**
  - Built advanced VideoTaggingService that analyzes video URLs and titles intelligently
  - Implemented multi-dimensional similarity scoring across categories, themes, visual styles, and technical features
  - Added "Find Similar Videos" functionality in video library dropdown menus
  - Created SimilarVideos component with AI analysis controls and confidence-scored recommendations
  - Added batch processing for analyzing entire video library efficiently
  - Integrated auto-tagging system for untagged videos with progress tracking
  - Enhanced video discovery through AI-powered content matching and reasoning display

### January 29, 2025 - Collapsible Sidebar with Full-Screen Mode
- **Implemented responsive collapsible sidebar for enhanced viewing experience**
  - Created CollapsibleSidebar component with smooth toggle transitions
  - Added compact mode showing only icons (e.g., gear icon for Settings)
  - Implemented expanded mode displaying icons + labels (e.g., gear + "Settings" text)
  - Integrated tooltips for quick reference in collapsed mode
  - Added full-screen main content area when sidebar is collapsed
  - Updated branding to "Chris' Secret Stash" with custom explicit logo design
  - Maintained professional dark gradient theme with pink/purple accent colors

### January 29, 2025 - Video Duplicate Detection and View Tracking System
- **Created comprehensive duplicate detection and viewing history system**
  - Added `urlHash` field to videos table for URL-based duplicate detection
  - Created `videoViews` table to track individual viewing sessions with duration and completion status
  - Built `duplicateLog` table to record blocked duplicate attempts with original video references
  - Implemented DuplicateDetectionService with URL normalization and hash generation
  - Added API endpoints for view tracking, duplicate checking, and history retrieval
  - Enhanced video upload process to automatically block duplicate URLs
  - Created WatchHistoryNotification component to alert users when rewatching content
  - Built ViewingHistory and DuplicateLog components for comprehensive tracking displays
  - Integrated bulk import with duplicate detection to prevent re-adding existing videos
  - System maintains expanding log of all videos/URLs for permanent duplicate prevention

### January 29, 2025 - Face Recognition Backend-Only Access
- **Moved face recognition to dedicated backend-only section per user request**
  - Removed face recognition elements from main navigation sidebar
  - Removed face recognition references from main dashboard and video player
  - Created dedicated FaceRecognition page accessible only via Settings > Advanced Backend Tools
  - Added face recognition access button in Settings under "Data Management" tab
  - Face recognition now clearly marked as server-side Python backend feature
  - Maintained all existing face recognition functionality for backend analysis
  - Updated navigation to focus on core video management features (Dashboard, Library, Recommendations, etc.)
  - Face recognition accessible only through explicit user action via settings button

### January 29, 2025 - Flexible Face Recognition Analysis Options
- **Enhanced face recognition interface to support flexible analysis modes**
  - Modified requirements to allow either video file OR target face image (both no longer required)
  - Added visual guide showing three analysis modes: Video Only, Face Only, Both Files
  - Updated form validation to require at least one file instead of both files
  - Enhanced submit button with dynamic text based on selected files
  - Added helpful descriptions for each analysis mode (detect all faces, analyze characteristics, find specific face)
  - Improved user experience with clearer instructions and flexible workflow options

### January 29, 2025 - Internet-Based Performer Search and Identification
- **Created comprehensive internet search system for performer identification**
  - Enhanced performers database schema with detailed fields (age, nationality, physical attributes, social media, biography)
  - Built PerformerSearchService with multi-engine reverse image search (Google, Bing, Yandex)
  - Created web scraping capabilities using Puppeteer for authentic performer data extraction
  - Added InternetPerformerSearch component with professional upload interface and confidence scoring
  - Implemented tabbed face recognition interface with "Face Analysis" and "Internet Search" modes
  - Added API endpoints for `/api/performers/search-by-image` and enhanced performer data retrieval
  - Automatic performer profile generation from internet search results with verification status
  - Integration with existing performers section for seamless profile management
  - Professional UI with confidence indicators, social media links, and biographical information display

### January 29, 2025 - AI-Powered Automated Video Discovery System
- **Created comprehensive internet video discovery engine with minimal manual input**
  - Built InternetVideoDiscoveryService that searches 10+ adult platforms automatically (ThisVid, PornHub, XVideos, etc.)
  - Implemented user profile generation from viewing history analysis (categories, performers, themes, patterns)
  - Created sophisticated AI search algorithm with multi-platform web scraping using Puppeteer
  - Added confidence scoring and reasoning for all discovered videos with platform-specific optimizations
  - Built AutomatedVideoDiscovery component with real-time progress tracking and auto-add functionality
  - Added dedicated Discovery page accessible from main navigation for 24/7 automated video finding
  - Implemented configurable discovery settings (batch size, confidence thresholds, auto-add preferences)
  - Created API endpoints for `/api/discovery/generate-profile`, `/api/discovery/search-videos`, and `/api/discovery/add-video`
  - Automatic duplicate detection prevents re-adding existing videos to library
  - Professional UI with platform icons, confidence indicators, and one-click video addition
  - System runs automatic discovery every 24 hours with high-confidence videos auto-added to library
  - Maximum automation approach with very few limits on discoverable content across internet platforms

### January 29, 2025 - Enhanced Thumbnail System for Discovery
- **Implemented comprehensive thumbnail system for all discovered videos**
  - Added platform-specific thumbnail generation for discovered videos (ThisVid, PornHub, XVideos, RedTube, XHamster)
  - Created TestDiscoveryButton component with working sample video seeding system
  - Enhanced discovery UI with authentic video thumbnails displayed alongside each recommendation
  - Built fallback SVG thumbnail system with platform branding when images fail to load
  - Added thumbnail proxy system for serving external platform images through the application
  - Integrated sample video seeder that adds 5 test videos (muscle, twink, bear, bareback, college categories)
  - Professional thumbnail layout with 128x80 preview images for each discovered video
  - Enhanced video library thumbnails with platform-specific authentic images
  - Complete testing system that works without requiring video uploads from user

### January 29, 2025 - Authentication-Aware Video Playback System
- **Fixed critical video playback issues with authentication-required sites**
  - Completely rebuilt SimpleVideoPlayer with proper authentication handling for ThisVid.com and PornHub
  - Fixed "video unavailable" errors by implementing smart redirect system for login-required sites
  - Added authentication detection: ThisVid and PornHub videos open in current tab to maintain login session
  - Other platforms open in new tab for better user experience
  - Enhanced Discovery section and TestDiscovery components with authentication-aware playback buttons
  - Updated all video play buttons throughout the application (Home, Discovery, Library) 
  - Added visual indicators: "Login & Watch" for authentication-required sites, "Play Video" for others
  - Implemented intelligent embed detection: skips iframe embedding for sites requiring authentication
  - Fixed InternetVideoSearch component play buttons with proper authentication handling
  - Ensures all videos can actually be watched instead of showing "video unavailable" errors