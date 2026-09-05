# Draft Preview: Guardian GPS (drf_002_guardian)

## Visual Mockup
![Guardian GPS Tactical Mockup](/home/nicholaas/.gemini/antigravity-ide/brain/c1799d99-4d3e-4dd2-8a97-868cf46934cb/autoguard_guardian_gps_1788566513657.jpg)

## Summary of Changes
- **360° Circular Doppler Radar**: Added an interactive rotating radar dish with range rings (1.5km radius), pulsating tactical hazard markers (potholes, speed traps, standing water), and clickable blip telemetry tooltips.
- **HUD Speedometer with Overspeed Warning**: High-contrast velocity readout with an interactive slider to simulate speed changes, dynamic alert badges, and lateral G-force metrics.
- **Doppler Weather Warning Banner**: Prominent banner for severe weather conditions (hydroplaning, black ice) with one-click evasive route computation.
- **Voice Co-Pilot Terminal Log**: Monospaced real-time transcript displaying synthesized voice announcements and hazard advisories.

## Implementation Files
- [GuardianView.tsx](file:///home/def/autoinspect/src/components/GuardianView.tsx)
- [weatherService.ts](file:///home/def/autoinspect/src/services/weatherService.ts)
- [App.tsx](file:///home/def/autoinspect/src/App.tsx)
