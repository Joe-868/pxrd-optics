# PXRD Optics

Interactive education and instrument-specific calculation tools for powder X-ray diffraction optics.

Website: <https://joe-868.github.io/pxrd-optics/>

## Overview

PXRD Optics is an independently developed, browser-based educational resource designed to improve understanding of X-ray diffraction optics and their influence on experimental measurements.

The project draws on the developer's extensive experience in X-ray diffraction, including instrument operation, laboratory management and researcher training.

It addresses a recurring challenge in XRD education: although many researchers routinely use diffraction instruments, they may have limited opportunities to develop a detailed understanding of the optical components and geometrical conditions underlying their measurements.

PXRD Optics aims to make these concepts more accessible through interactive visualisations, educational explanations and practical calculation tools.

The resource has been used in researcher training at the University of Warwick.

## General XRD Optics

The educational modules introduce fundamental concepts including divergence slits, Soller slits, beam masks, programmable divergence slits, beam geometry and sample illumination.

Interactive diagrams help users explore how different optical components affect measurement conditions.

The diagrams are primarily intended for conceptual understanding and are not necessarily to scale.

## Instrument-Specific Configurations

### Malvern Panalytical Empyrean iCore/MultiCore

The Panalytical calculator uses instrument-specific reference values and geometrical relationships based on the manufacturer's instrument/software Help documentation.

The FWHM and axial footprint reference tables apply to the documented dual-mask optical configuration.

These values should not be assumed valid for other incident-optics arrangements without verification.

### Anton Paar XRDynamic 500

The Anton Paar module provides an educational beam-mask selection calculator based on manufacturer-supplied technical guidance and elementary geometrical relationships.

It estimates beam width for specified optical configurations and parameter values.

The model is configuration-dependent and should only be applied within its stated assumptions.

## Educational Use

PXRD Optics is intended for postgraduate students, postdoctoral researchers, research technical professionals and other scientists using powder X-ray diffraction.

It is designed to complement instrument training and technical documentation by making important optical principles easier to visualise and understand.

## Scientific Sources and Limitations

The educational content draws on established diffraction principles, manufacturer documentation and practical experience in XRD training.

Some schematic diagrams were created with AI assistance and subsequently reviewed and corrected by the developer.

Instrument-specific reference values and geometrical calculations are applicable only within their documented configurations and assumptions.

Users should verify calculated results against their actual instrument configuration and relevant manufacturer guidance.

## Site Contents

| Layer | Page | File |
|---|---|---|
| General XRD optics | Divergence slit | `divergent-slit.html` |
| General XRD optics | Soller slits | `soller.html` |
| General XRD optics | Beam masks | `training.html` |
| General XRD optics | Fixed, programmable and automatic DS | `slits.html` |
| General XRD optics | Beam geometry and sample illumination | `beam-geometry.html` |
| Instrument-specific | Malvern Panalytical Empyrean iCore/MultiCore | `calculator.html`, `app.js` |
| Instrument-specific | Anton Paar XRDynamic 500 | `anton-paar/` |

The site is static HTML, CSS and JavaScript served by GitHub Pages; no build step is required.

## Attribution and Disclaimer

PXRD Optics is an independently developed educational resource and is not an official product of, or endorsed by, Malvern Panalytical or Anton Paar.

Manufacturer names and trademarks remain the property of their respective owners.

Third-party documentation, images and technical data remain subject to their applicable rights and are not automatically covered by any licence applied to the original project code.

The software is intended for educational use and does not replace appropriate instrument training or experimental verification.
