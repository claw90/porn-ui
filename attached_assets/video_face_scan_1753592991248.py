import cv2
import face_recognition
import os

# Load the known image
print("🔍 Loading target face from target.jpg...")
target_image = face_recognition.load_image_file("target.jpg")
target_encoding = face_recognition.face_encodings(target_image)[0]

# Set your video file here
video_path = "cam196-part3.mp4"
print(f"🎥 Scanning {video_path}...")

video_capture = cv2.VideoCapture(video_path)

frame_number = 0
matches_found = 0

while True:
    ret, frame = video_capture.read()
    if not ret:
        break

    frame_number += 1
    rgb_frame = frame[:, :, ::-1]

    face_locations = face_recognition.face_locations(rgb_frame)

    if not face_locations:
        print(f"Frame {frame_number}: No faces detected.")
        continue

    face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

    match_count = 0
    for encoding, location in zip(face_encodings, face_locations):
        results = face_recognition.compare_faces([target_encoding], encoding, tolerance=0.6)
        if results[0]:
            cv2.imwrite(f"match_frame_{frame_number}.jpg", frame)
            match_count += 1
            matches_found += 1
            top, right, bottom, left = location
            print(f"✅ Match found at frame {frame_number} (top={top}, right={right}, bottom={bottom}, left={left})")

    print(f"Frame {frame_number}: {len(face_encodings)} face(s) found, {match_count} match(es).")

video_capture.release()
print(f"\n🎉 Done! Found {matches_found} matching frame(s).")
