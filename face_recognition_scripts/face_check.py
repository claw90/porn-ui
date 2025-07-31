import face_recognition
import os
import sys
import json

def main():
    if len(sys.argv) < 3:
        print("Usage: python face_check.py <target_image> <image_folder>")
        sys.exit(1)
    
    target_image_path = sys.argv[1]
    image_folder = sys.argv[2]
    
    # Load the known image (your target face)
    try:
        target_image = face_recognition.load_image_file(target_image_path)
        target_encodings = face_recognition.face_encodings(target_image)
    except Exception as e:
        print(f"Error loading target image: {e}")
        sys.exit(1)

    if not target_encodings:
        print("No face found in target image. Make sure it's a clear face shot.")
        sys.exit(1)

    target_encoding = target_encodings[0]

    matches = []

    for filename in os.listdir(image_folder):
        if not (filename.lower().endswith(".jpg") or filename.lower().endswith(".png") or filename.lower().endswith(".jpeg")):
            continue

        image_path = os.path.join(image_folder, filename)
        try:
            image = face_recognition.load_image_file(image_path)
            encodings = face_recognition.face_encodings(image)

            for encoding in encodings:
                match = face_recognition.compare_faces([target_encoding], encoding, tolerance=0.45)[0]
                if match:
                    matches.append({
                        "filename": filename,
                        "path": image_path
                    })
                    break
        except Exception as e:
            continue

    # Output results as JSON
    result = {
        "target_image": target_image_path,
        "search_folder": image_folder,
        "matches_found": len(matches),
        "matches": matches
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
