# 🧩 Documentation Overview – `twitter-api-adapter` Package

This document provides a quick overview and workflow for integrating the `twitter-api-adapter` into your project.

## 📦 Package Location
`/Packages/twitter-api-adapter`

## 🔧 What It Does
* Enables support for **Twitter V2 API** and **custom scraping** logic.
* Handles:
   * Tweet scraping
   * Replies (including media)
   

## ⚙️ Integration Guide

### 📂 File to Modify
`/twitter-scrapper/main.js`

### 🚀 How to Use
1. **Import the package** into `main.js`:

```js
import './Packages/twitter-api-adapter';,
const twitterApiAdapter = require('./Packages/twitter-api-adapter');

```

2. This will:
   * Enable **Twitter V2 API** functionality.
   * Allow **parallel support** for both API-based and custom scraping modules.

## 🎯 Features at a Glance

| Feature | Supported |
|---------|:---------:|
| Tweet Scraping | ✅ |
| Reply Scraping | ✅ |
| Media Handling | ✅ |
| V2 API Integration | ✅ |
| Custom Scraper Support | ✅ |