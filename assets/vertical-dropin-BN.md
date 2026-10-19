# ভার্টিকাল হিরো ভিডিও — Drop-in গাইড (Flow থেকে ভিডিও পাওয়ার পর)

> Google Flow-তে Veo 3 দিয়ে ভিডিও জেনারেট করে ডাউনলোড করার পর এই ধাপগুলো অনুসরণ করুন।

## ১. ফাইল সেভ করুন এই নামে

Flow থেকে ডাউনলোড করা ফাইলটার নাম বদলে রাখুন:

```
ride-bangla-tools-hero-vertical.mp4
```

⚠️ আমার বানানো `ride-bangla-tools-vertical-final.mp4` ফাইলটা ব্যাকআপ হিসেবে রেখে দিন — Flow-এর ফাইলটাকে **একই নামে সেভ করবেন না**, নইলে ওভাররাইট হয়ে যাবে।

## ২. পোস্টার ইমেজ

`v-endcard.jpg` (720×1280, ভার্টিকাল — ভিডিওর সাথে মাপে মিলে) আপলোড করুন। ভিডিও লোড হওয়ার আগে এটাই দেখাবে।

## ৩. tools/assets/ ফোল্ডারে আপলোড করুন

1. `ride-bangla-tools-hero-vertical.mp4` (আপনার Flow ভিডিও)
2. `v-endcard.jpg` (পোস্টার)

## ৪. হিরোতে বসানোর কোড (সাউন্ডসহ, 9:16)

হোমপেজের হিরো সেকশনে ভিডিওর জায়গায় এই ব্লকটা বসান:

```html
<div class="hero-video-vertical">
  <video controls playsinline preload="metadata" poster="assets/v-endcard.jpg">
    <source src="assets/ride-bangla-tools-hero-vertical.mp4" type="video/mp4">
  </video>
</div>
<style>
.hero-video-vertical{max-width:380px;margin:0 auto;border-radius:18px;overflow:hidden;
  box-shadow:0 24px 60px rgba(6,32,19,.35);border:1px solid rgba(255,255,255,.12);}
.hero-video-vertical video{width:100%;display:block;aspect-ratio:9/16;background:#0B3D24;}
</style>
```

## ৫. মনে রাখবেন

- ⚠️ `index-video-optionA/B.html` আর `hero-video-integration.html` — এই ফাইলগুলো **16:9 হরিজন্টাল** ভিডিওর জন্য বানানো। ভার্টিকাল ভিডিও ওগুলোতে সরাসরি বসালে চাপা বা কাটা দেখাবে — উপরের ৪ নম্বর ব্লকটাই ব্যবহার করুন।
- Flow থেকে ডাউনলোডের সময় **9:16 / 720×1280** এক্সপোর্ট নেবেন।
- Veo 3-র ডায়ালগ অডিও ভিডিও ফাইলের ভেতরেই থাকে — আলাদা ভয়েস মার্জ লাগবে না।
- ফাইল ~১–২MB-এর মধ্যে রাখলে হিরো দ্রুত লোড হবে (আমার বানানোটা ১.১MB)।
- ডেস্কটপে ভিডিওটা ডান পাশে (Option A-র `hero-visual` জায়গায়), মোবাইলে মাঝখানে — দুই ডিভাইসেই ঠিক দেখাবে।
