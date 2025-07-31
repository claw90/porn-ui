import face_recognition
import os

# Load the known image (your target face)
target_image = face_recognition.load_image_file("target.jpg")
target_encodings = face_recognition.face_encodings(target_image)

if not target_encodings:
    print("❌ No face found in target.jpg. Make sure it's a clear face shot.")
    exit()

target_encoding = target_encodings[0]

# Folder of images to check
image_folder = "images_to_check"

print(f"\n🔍 Scanning folder: {image_folder}\n")

matches = []

for filename in os.listdir(image_folder):
    if not (filename.endswith(".jpg") or filename.endswith(".png")):
        continue

    image_path = os.path.join(image_folder, filename)
    try:
        image = face_recognition.load_image_file(image_path)
        encodings = face_recognition.face_encodings(image)

        for encoding in encodings:
            match = face_recognition.compare_faces([target_encoding], encoding, tolerance=0.45)[0]
            if match:
                matches.append(filename)
                print(f"✅ MATCH: {filename}")
                break
    except Exception as e:
        print(f"⚠️ Skipped {filename}: {e}")

print("\n🧠 Done scanning.")

if not matches:
    print("❌ No matches found.")
else:
    print(f"\n🎯 Found {len(matches)} match(es): {matches}")
