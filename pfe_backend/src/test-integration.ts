import { PrismaClient, Role, JobExperienceLevel } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import axios from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required in .env');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const BACKEND_URL = 'http://localhost:3000/api/v1';

// Values echoed back by our own API (ids, scores) are logged/interpolated
// into URLs below. Sanitize before logging (strip characters that could
// forge extra log lines) and always URL-encode before using in a path
// segment, even though this script only ever talks to our own backend.
function sanitizeForLog(value: unknown): string {
  return String(value).replace(/[\r\n]/g, '');
}

async function run() {
  console.log('--- STARTING END-TO-END MATCHING PIPELINE INTEGRATION TEST ---');

  // Clean existing test data if any
  await prisma.application.deleteMany({
    where: {
      candidate: {
        email: {
          in: ['test-candidate@example.com', 'test-recruiter@example.com'],
        },
      },
    },
  });

  await prisma.jobOffer.deleteMany({
    where: {
      recruiter: {
        email: 'test-recruiter@example.com',
      },
    },
  });

  await prisma.candidateProfile.deleteMany({
    where: {
      user: {
        email: 'test-candidate@example.com',
      },
    },
  });

  await prisma.recruiterProfile.deleteMany({
    where: {
      user: {
        email: 'test-recruiter@example.com',
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['test-candidate@example.com', 'test-recruiter@example.com'],
      },
    },
  });

  console.log('1. Registering Recruiter...');
  try {
    await axios.post(`${BACKEND_URL}/auth/register`, {
      firstName: 'Recruiter',
      lastName: 'Test',
      email: 'test-recruiter@example.com',
      password: 'Password123!',
      role: Role.RECRUITER,
    });
  } catch (err: any) {
    console.error(
      'Recruiter registration failed:',
      err.response?.data || err.message,
    );
  }

  console.log('2. Registering Candidate...');
  try {
    await axios.post(`${BACKEND_URL}/auth/register`, {
      firstName: 'Candidate',
      lastName: 'Test',
      email: 'test-candidate@example.com',
      password: 'Password123!',
      role: Role.CANDIDATE,
    });
  } catch (err: any) {
    console.error(
      'Candidate registration failed:',
      err.response?.data || err.message,
    );
  }

  console.log('3. Directly verifying users in PostgreSQL...');
  await prisma.user.updateMany({
    where: {
      email: {
        in: ['test-candidate@example.com', 'test-recruiter@example.com'],
      },
    },
    data: { isEmailVerified: true },
  });
  console.log('Emails marked verified.');

  console.log('4. Logging in as Recruiter...');
  const recruiterLogin = await axios.post(`${BACKEND_URL}/auth/login`, {
    email: 'test-recruiter@example.com',
    password: 'Password123!',
  });
  const recruiterRes = recruiterLogin.data.data ?? recruiterLogin.data;
  const recruiterToken = recruiterRes.tokens.accessToken;
  console.log('Recruiter Login successful.');

  console.log('5. Logging in as Candidate...');
  const candidateLogin = await axios.post(`${BACKEND_URL}/auth/login`, {
    email: 'test-candidate@example.com',
    password: 'Password123!',
  });
  const candidateRes = candidateLogin.data.data ?? candidateLogin.data;
  const candidateToken = candidateRes.tokens.accessToken;
  console.log('Candidate Login successful.');

  console.log('6. Completing Recruiter Profile...');
  await axios.post(
    `${BACKEND_URL}/profiles/recruiter`,
    {
      position: 'Hiring Lead',
      department: 'Engineering',
      company: {
        name: 'Google Test Labs ' + Date.now(),
      },
    },
    {
      headers: { Authorization: `Bearer ${recruiterToken}` },
    },
  );
  console.log('Recruiter Profile completed.');

  console.log('7. Completing Candidate Profile...');
  await axios.post(
    `${BACKEND_URL}/profiles/candidate`,
    {
      professionalSummary:
        'Senior Frontend Engineer with 5 years of React and TypeScript experience.',
      skills: [
        { name: 'React', level: 5 },
        { name: 'TypeScript', level: 5 },
        { name: 'JavaScript', level: 5 },
        { name: 'Next.js', level: 4 },
      ],
      experiences: [
        {
          company: 'Google',
          position: 'Senior Frontend Engineer',
          startDate: '2021-01-01T00:00:00.000Z',
          endDate: '2026-01-01T00:00:00.000Z',
          description:
            'Worked on Next.js apps, React components, and state management.',
        },
      ],
      education: [
        {
          school: 'University of Science',
          degree: 'Bachelor',
          field: 'Computer Science',
          startDate: '2016-09-01T00:00:00.000Z',
          endDate: '2020-06-30T00:00:00.000Z',
        },
      ],
      languages: [
        { language: 'English', level: 'NATIVE' },
        { language: 'French', level: 'ADVANCED' },
      ],
    },
    {
      headers: { Authorization: `Bearer ${candidateToken}` },
    },
  );
  console.log('Candidate Profile completed.');

  console.log('8. Creating a Job Offer (Recruiter)...');
  const jobOfferRes = await axios.post(
    `${BACKEND_URL}/job-offers`,
    {
      title: 'Senior React Developer',
      location: 'Mountain View',
      city: 'Mountain View',
      country: 'USA',
      employmentType: 'FULL_TIME',
      workplaceType: 'HYBRID',
      experienceLevel: JobExperienceLevel.SENIOR,
      description:
        'We are seeking a Senior React Developer proficient in React, TypeScript, and state management.',
      requiredSkills: ['React', 'TypeScript', 'JavaScript'],
      preferredSkills: ['Next.js', 'TailwindCSS'],
      responsibilities: ['Develop clean UI', 'Optimize performance'],
      requirements: ['5+ years experience', 'Bachelor degree in CS'],
      benefits: ['Health insurance', '401k'],
      languages: ['English'],
    },
    {
      headers: { Authorization: `Bearer ${recruiterToken}` },
    },
  );
  const jobResData = jobOfferRes.data.data ?? jobOfferRes.data;
  const jobId = jobResData.id;
  console.log(`Job Offer created with ID: ${sanitizeForLog(jobId)}`);

  // Publish job offer
  await axios.patch(
    `${BACKEND_URL}/job-offers/${encodeURIComponent(jobId)}/publish`,
    {},
    {
      headers: { Authorization: `Bearer ${recruiterToken}` },
    },
  );
  console.log('Job Offer published.');

  console.log('9. Submitting Candidate Application with a test CV file...');
  // Find a sample PDF file in backend/uploads/applications/cvs/ to upload
  const cvsDir = path.join(__dirname, '../uploads/applications/cvs');
  const cvFiles = fs.readdirSync(cvsDir).filter((f) => f.endsWith('.pdf'));
  if (cvFiles.length === 0) {
    throw new Error(
      'No PDF files found in backend/uploads/applications/cvs to run integration test.',
    );
  }
  const sampleCvPath = path.join(cvsDir, cvFiles[0]);
  console.log(`Using sample CV for application: ${sampleCvPath}`);

  const form = new FormData();
  form.append('jobOfferId', jobId);
  form.append(
    'coverLetter',
    'I would love to apply for this Senior React role.',
  );
  form.append('cv', fs.createReadStream(sampleCvPath));

  const applyRes = await axios.post(`${BACKEND_URL}/applications`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${candidateToken}`,
    },
  });
  const applyResData = applyRes.data.data ?? applyRes.data;
  const applicationId = applyResData.id;
  console.log(
    `Application submitted successfully. Application ID: ${sanitizeForLog(
      applicationId,
    )}`,
  );

  console.log(
    '10. Retrieving Application Details and verifying AI Fit Score (polling)...',
  );
  let appDetails: any = null;
  for (let i = 0; i < 15; i++) {
    try {
      const appDetailsRes = await axios.get(
        `${BACKEND_URL}/applications/${encodeURIComponent(applicationId)}`,
        {
          headers: { Authorization: `Bearer ${candidateToken}` },
        },
      );
      appDetails = appDetailsRes.data.data ?? appDetailsRes.data;
      if (appDetails.aiAnalysis) {
        break;
      }
    } catch (err: any) {
      console.log(`Failed to fetch application: ${err.message}`);
    }
    console.log(
      `AI Analysis is still null, waiting 1s... (attempt ${i + 1}/15)`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(
    'AI Analysis Data:',
    sanitizeForLog(JSON.stringify(appDetails?.aiAnalysis)),
  );

  if (appDetails?.aiAnalysis) {
    const score =
      appDetails.aiAnalysis.score ??
      appDetails.aiAnalysis.matchScore ??
      appDetails.aiAnalysis.globalScore;
    console.log(
      `>>> SUCCESS! AI Matching Score computed successfully: ${sanitizeForLog(
        score,
      )}% <<<`,
    );
  } else {
    console.error('>>> FAILURE: AI Analysis is null or was not computed <<<');
  }

  // Cleanup test users and data
  await prisma.application.deleteMany({
    where: { id: applicationId },
  });
  await prisma.jobOffer.deleteMany({
    where: { id: jobId },
  });
  await prisma.candidateProfile.deleteMany({
    where: { user: { email: 'test-candidate@example.com' } },
  });
  await prisma.recruiterProfile.deleteMany({
    where: { user: { email: 'test-recruiter@example.com' } },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['test-candidate@example.com', 'test-recruiter@example.com'],
      },
    },
  });
  console.log('Test data cleaned up.');
  console.log('--- INTEGRATION TEST FINISHED ---');
}

run()
  .catch((err) => {
    console.error('Integration test failed with error:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
