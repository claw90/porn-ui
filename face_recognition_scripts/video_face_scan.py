#!/usr/bin/env python3
import cv2
import face_recognition
import os
import sys
import json
import argparse
from datetime import timedelta

def format_timestamp(frame_number, fps):
    """Convert frame number to timestamp format"""
    seconds = frame_number / fps
    return str(timedelta(seconds=int(seconds)))

def main():
    parser = argparse.ArgumentParser(description='Scan video for face matches')
    parser.add_argument('--video', required=True, help='Path to video file')
    parser.add_argument('--target', required=True, help='Path to target face image')
    parser.add_argument('--output', required=True, help='Output directory for results')
    parser.add_argument('--tolerance', type=float, default=0.6, help='Face matching tolerance')
    parser.add_argument('--frame-skip', type=int, default=5, help='Process every nth frame')
    parser.add_argument('--save-thumbnails', action='store_true', help='Save thumbnail images of matches')
    
    args = parser.parse_args()
    
    # Load the target face
    try:
        target_image = face_recognition.load_image_file(args.target)
        target_encodings = face_recognition.face_encodings(target_image)
    except Exception as e:
        print(json.dumps({"error": f"Error loading target image: {e}"}))
        sys.exit(1)
    
    if not target_encodings:
        print(json.dumps({"error": "No face found in target image."}))
        sys.exit(1)
    
    target_encoding = target_encodings[0]
    
    # Open video
    try:
        video_capture = cv2.VideoCapture(args.video)
        fps = video_capture.get(cv2.CAP_PROP_FPS)
        if fps == 0:
            fps = 30  # default fallback
    except Exception as e:
        print(json.dumps({"error": f"Error opening video: {e}"}))
        sys.exit(1)
    
    frame_number = 0
    matches = []
    
    # Create thumbnails directory if saving thumbnails
    if args.save_thumbnails:
        thumbnails_dir = os.path.join(args.output, 'thumbnails')
        os.makedirs(thumbnails_dir, exist_ok=True)
    
    while True:
        ret, frame = video_capture.read()
        if not ret:
            break
        
        frame_number += 1
        
        # Skip frames based on frame_skip parameter
        if frame_number % args.frame_skip != 0:
            continue
        
        # Convert BGR to RGB (OpenCV uses BGR, face_recognition uses RGB)
        rgb_frame = frame[:, :, ::-1]
        
        # Find face locations and encodings
        face_locations = face_recognition.face_locations(rgb_frame)
        
        if not face_locations:
            continue
        
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        for i, encoding in enumerate(face_encodings):
            # Compare with target face
            results = face_recognition.compare_faces([target_encoding], encoding, tolerance=args.tolerance)
            if results[0]:
                # Calculate confidence (distance)
                face_distances = face_recognition.face_distance([target_encoding], encoding)
                confidence = max(0, 1 - face_distances[0])  # Ensure non-negative
                
                timestamp = format_timestamp(frame_number, fps)
                
                match_data = {
                    "frameNumber": frame_number,
                    "timestamp": timestamp,
                    "confidence": float(confidence)
                }
                
                # Save thumbnail if requested
                if args.save_thumbnails:
                    thumbnail_filename = f"match_frame_{frame_number}.jpg"
                    thumbnail_path = os.path.join(thumbnails_dir, thumbnail_filename)
                    cv2.imwrite(thumbnail_path, frame)
                    match_data["thumbnailPath"] = f"outputs/{os.path.basename(args.output)}/thumbnails/{thumbnail_filename}"
                
                matches.append(match_data)
    
    video_capture.release()
    
    # Output results as JSON
    result = {
        "video_file": args.video,
        "target_face": args.target,
        "total_frames": frame_number,
        "matches_found": len(matches),
        "matches": matches,
        "settings": {
            "tolerance": args.tolerance,
            "frame_skip": args.frame_skip,
            "save_thumbnails": args.save_thumbnails
        }
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()