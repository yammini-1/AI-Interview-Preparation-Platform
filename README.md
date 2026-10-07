# 🤖 AI Interview Preparation Platform

An AI-powered full-stack web application designed to help candidates prepare for technical interviews through role-specific interview questions, resume analysis, personalized answer evaluation, and interview history tracking.

## 🚀 Features

### 🎯 Mock Interview Questions
- Generate interview questions based on the selected job role.
- Supports different experience levels.
- Allows users to choose the number of questions.
- Uses an LLM API for AI-generated questions.
- Includes a built-in fallback question bank when the AI service is unavailable.

### 📝 Answer Evaluation
- Answer interview questions directly within the platform.
- Receive an overall score out of 100.
- Get personalized feedback on:
  - Strengths
  - Areas for improvement
  - Technical depth
  - Clarity and relevance
  - Suggested better approach

### 📄 Resume Feedback
- Submit resume content along with the target role.
- Receive a resume score.
- Identify strengths in the resume.
- Get specific suggestions for improvement.
- Uses AI-powered analysis when the LLM API is available.
- Includes rule-based fallback feedback when the AI service is unavailable.

### 📊 Interview History
- Stores previous interview practice sessions.
- Allows users to review previous questions, evaluations, and scores.
- Helps track interview preparation progress.

### 🛡️ Fallback System
The application is designed to remain functional even when the LLM API is unavailable.

It automatically falls back to:
- Built-in interview questions
- Rule-based resume analysis
- Default answer evaluation

This provides reliable functionality during development and testing.

---

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js
- REST APIs

### AI Integration
- LLM API
- Anthropic API
- AI-generated interview questions
- AI-powered answer evaluation
- AI-assisted resume feedback

### Tools
- Visual Studio Code
- Git
- GitHub
- npm
- Postman

---

## 🏗️ Project Architecture

```text
                    ┌─────────────────────┐
                    │        User         │
                    │  Interview Practice │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Frontend       │
                    │   HTML/CSS/JS       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Express Backend   │
                    │      REST APIs      │
                    └──────────┬──────────┘
                               │
                       ┌───────┴───────┐
                       │               │
                       ▼               ▼
                ┌─────────────┐ ┌─────────────┐
                │   LLM API   │ │  Fallback   │
                │             │ │    Logic    │
                └──────┬──────┘ └──────┬──────┘
                       │               │
                       └───────┬───────┘
                               ▼
                    ┌─────────────────────┐
                    │ Interview Results   │
                    │ Score & Feedback    │
                    └─────────────────────┘