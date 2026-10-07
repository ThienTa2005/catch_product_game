"""Smart Automatic Background Removal for Product Images.
Supports:
- Transparent PNG preservation & tight bounding box crop
- Smart Edge/FloodFill for white & studio solid backgrounds
- OpenCV GrabCut foreground extraction for complex backgrounds
- Anti-aliased alpha feathering for smooth transparent borders
"""
import cv2
import numpy as np
from PIL import Image

def remove_background(pil_img: Image.Image) -> Image.Image:
    """Automatically remove the background of an image and return an RGBA PIL Image."""
    # 1. If already transparent (> 3% transparent pixels), keep and crop tightly
    if pil_img.mode in ('RGBA', 'LA'):
        alpha = np.array(pil_img.split()[-1])
        if np.mean(alpha < 240) > 0.03:
            bbox = pil_img.getbbox()
            if bbox:
                w, h = pil_img.size
                bx1, by1, bx2, by2 = bbox
                bx1, by1 = max(0, bx1 - 2), max(0, by1 - 2)
                bx2, by2 = min(w, bx2 + 2), min(h, by2 + 2)
                return pil_img.crop((bx1, by1, bx2, by2))
            return pil_img

    orig_w, orig_h = pil_img.size
    if orig_w < 8 or orig_h < 8:
        return pil_img.convert('RGBA')

    # Resize for fast processing if larger than 600px
    max_dim = 600
    if max(orig_w, orig_h) > max_dim:
        scale = max_dim / max(orig_w, orig_h)
        work_w, work_h = max(8, int(orig_w * scale)), max(8, int(orig_h * scale))
        work_img = pil_img.resize((work_w, work_h), Image.Resampling.LANCZOS)
    else:
        work_img = pil_img
        work_w, work_h = orig_w, orig_h

    rgb_img = work_img.convert('RGB')
    np_img = np.array(rgb_img)

    # Sample corners (top-left, top-right, bottom-left, bottom-right)
    corners = np.array([
        np_img[0, 0], np_img[0, work_w - 1],
        np_img[work_h - 1, 0], np_img[work_h - 1, work_w - 1]
    ], dtype=np.float32)

    is_white_bg = np.all(corners > 215)
    corner_var = np.var(corners, axis=0).mean()

    mask = None

    # Strategy A: Uniform / White / Studio Backdrop
    if is_white_bg or corner_var < 180:
        bg_color = np.median(corners, axis=0)
        diff = np.linalg.norm(np_img.astype(np.float32) - bg_color, axis=2)
        threshold = 32.0 if is_white_bg else 28.0

        # Flood fill starting from all 4 borders
        flood_mask = np.zeros((work_h + 2, work_w + 2), np.uint8)
        border_pts = [
            (0, 0), (work_w - 1, 0), (0, work_h - 1), (work_w - 1, work_h - 1),
            (work_w // 2, 0), (work_w // 2, work_h - 1),
            (0, work_h // 2), (work_w - 1, work_h // 2)
        ]
        cp = np_img.copy()
        lo = (35, 35, 35) if is_white_bg else (25, 25, 25)
        up = (35, 35, 35) if is_white_bg else (25, 25, 25)
        for (sx, sy) in border_pts:
            cv2.floodFill(cp, flood_mask, (sx, sy), (0, 0, 0),
                          loDiff=lo, upDiff=up, flags=4 | cv2.FLOODFILL_MASK_ONLY)

        bg_connected = flood_mask[1:-1, 1:-1] > 0
        cand_mask = np.full((work_h, work_w), 255, dtype=np.uint8)
        cand_mask[bg_connected] = 0
        cand_mask[diff < threshold] = 0

        # Only accept if non-trivial foreground detected
        fg_ratio = np.mean(cand_mask > 0)
        if 0.04 < fg_ratio < 0.98:
            mask = cand_mask

    # Strategy B: GrabCut Foreground Extraction
    if mask is None:
        try:
            gc_mask = np.zeros((work_h, work_w), np.uint8)
            bgdModel = np.zeros((1, 65), np.float64)
            fgdModel = np.zeros((1, 65), np.float64)
            margin_x = max(2, int(work_w * 0.04))
            margin_y = max(2, int(work_h * 0.04))
            rect = (margin_x, margin_y, work_w - 2 * margin_x, work_h - 2 * margin_y)
            cv2.grabCut(np_img, gc_mask, rect, bgdModel, fgdModel, 3, cv2.GC_INIT_WITH_RECT)
            cand_mask = np.where((gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
            fg_ratio = np.mean(cand_mask > 0)
            if 0.03 < fg_ratio < 0.98:
                mask = cand_mask
        except Exception:
            pass

    # Fallback: if both failed or mask empty, return original with full alpha
    if mask is None or np.all(mask == 0):
        return pil_img.convert('RGBA')

    # Morphological hole filling & edge cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    # Edge feathering for smooth non-pixelated border
    mask = cv2.GaussianBlur(mask, (3, 3), 0)

    # Scale mask back to original resolution if downsampled
    if (work_w, work_h) != (orig_w, orig_h):
        mask = cv2.resize(mask, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)

    orig_rgb = np.array(pil_img.convert('RGB'))
    rgba = np.dstack((orig_rgb, mask))
    res = Image.fromarray(rgba, 'RGBA')

    # Tight crop to subject bounds with 3px padding
    bbox = res.getbbox()
    if bbox:
        bx1, by1, bx2, by2 = bbox
        bx1, by1 = max(0, bx1 - 3), max(0, by1 - 3)
        bx2, by2 = min(orig_w, bx2 + 3), min(orig_h, by2 + 3)
        if bx2 > bx1 and by2 > by1:
            res = res.crop((bx1, by1, bx2, by2))

    return res
