import cv2
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
print("Opened:", cap.isOpened())
for i in range(10):
    ret, frame = cap.read()
    print(i, "ret:", ret)
cap.release()