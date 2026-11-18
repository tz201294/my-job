import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BrandMark, Wordmark } from './Brand';
import { paths } from '../routes';

// The Privacy Policy and Terms of Service. Readable without an account (/privacy, /terms).
//
// When the wording changes in a way people must agree to again, also change TERMS_VERSION in
// backend/app/core/legal.py (each account records the version it accepted) and LAST_UPDATED below.

export const LAST_UPDATED = '18 November 2026';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';

function Contact() {
  return CONTACT_EMAIL
    ? <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-teal-700 underline">{CONTACT_EMAIL}</a>
    : <strong>the contact address published on this page</strong>;
}

function Shell({ title, children }) {
  const location = useLocation();
  const go = useNavigate();
  const back = () => (location.key !== 'default' ? go(-1) : go(paths.home));
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button type="button" onClick={back}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="flex items-center gap-2"><BrandMark size={32} title="Prologue" /><Wordmark className="text-xl" /></span>
        </div>
        <article className="legal bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8 text-sm leading-relaxed text-slate-700">
          <h1 className="text-2xl font-black text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 mt-1 mb-6">Last updated {LAST_UPDATED}</p>
          {children}
        </article>
        <p className="text-center text-xs text-slate-500 mt-6">
          <a href={`${import.meta.env.BASE_URL}privacy`} className="hover:underline">Privacy Policy</a>
          {' · '}
          <a href={`${import.meta.env.BASE_URL}terms`} className="hover:underline">Terms of Service</a>
        </p>
      </div>
    </div>
  );
}

const H2 = ({ children }) => <h2 className="text-base font-black text-slate-900 mt-7 mb-2">{children}</h2>;
const P = ({ children }) => <p className="mb-3">{children}</p>;
const UL = ({ children }) => <ul className="list-disc pl-5 space-y-1.5 mb-3">{children}</ul>;

export function PrivacyPage() {
  return (
    <Shell title="Privacy Policy">
      <P>
        Prologue is a place where people share how their work really works. This page explains what we store about
        you, why, who helps us run the service, and the choices you have. We've tried to keep it short and plain.
      </P>

      <H2>The short version</H2>
      <UL>
        <li>We store what you give us to run your account and show your content. We don't sell it, and we don't show ads.</li>
        <li>There are no tracking cookies and no analytics. Your browser keeps only your login.</li>
        <li>Your sign-up survey answers are used for research only if you agree, and then only without your name, email or username.</li>
        <li>You can see and correct your details in Settings, download all your data, or delete your account at any time.</li>
      </UL>

      <H2>What we store</H2>
      <UL>
        <li><strong>Your account:</strong> username, display name, password (stored only as a one-way hash, which nobody can read back), and your email address if you add one, with whether you've confirmed it.</li>
        <li><strong>Your profile:</strong> bio, photo, your work (field, job title, specialization, years of experience, company) and your interests.</li>
        <li><strong>Your sign-up survey:</strong> whether you work (or what describes you), gender, age, and optionally country and education, plus your choice about sharing them for research.</li>
        <li><strong>What you do on Prologue:</strong> posts, stories, comments, reactions, likes, saved posts, follows, questions and answers, challenges and ideas, reviews, reports you send and accounts you block, and the notifications we create for you.</li>
        <li><strong>The date you accepted these terms</strong> and which version.</li>
        <li><strong>Technical information:</strong> to protect accounts, the server briefly keeps your IP address in memory to count failed logins and limit spam. It isn't written to our database. Our hosting providers keep standard server logs for a short time.</li>
      </UL>

      <H2>What others can see</H2>
      <P>
        Your profile, posts, stories, comments, questions, challenges, ideas and reviews are public, so other visitors can see them.
        Your email address, sign-up survey, saved posts, the accounts you block and the reports you send are private.
        People you report or block are never told it was you.
      </P>

      <H2>Why we use it</H2>
      <UL>
        <li><strong>To run the service you signed up for:</strong> your account, your content, notifications, and the emails you ask for (confirming your address, resetting your password).</li>
        <li><strong>To keep Prologue safe:</strong> spam and login limits, reports, blocking, and moderators reviewing reported content.</li>
        <li><strong>To fix problems:</strong> when the app crashes we receive an error report (see below).</li>
        <li><strong>For research, only if you agree:</strong> if you tick the box at sign-up (you can change it any time in Settings),
          your survey answers may be included, without your name, email, username or anything that identifies you, in anonymised
          data about who works where and what interests people.</li>
      </UL>

      <H2>Who helps us run Prologue</H2>
      <P>These services handle data for us, only to provide their part of the service:</P>
      <UL>
        <li><strong>Render</strong> runs our server and <strong>Neon</strong> hosts our database, both in Frankfurt, Germany (EU).</li>
        <li><strong>GitHub Pages</strong> serves the website itself.</li>
        <li><strong>Brevo</strong> sends our emails (confirmation and password-reset links).</li>
        <li><strong>Cloudinary</strong> stores and delivers photos you upload.</li>
        <li><strong>Sentry</strong> receives crash reports: what went wrong and where in our code. They are set up to leave out your
          IP address, passwords, login tokens and what you typed.</li>
      </UL>
      <P>Some of these companies are based outside the EU. Where data leaves the EU, they protect it with the safeguards the law requires, such as the EU's standard contractual clauses.</P>

      <H2>What your browser keeps</H2>
      <P>
        Prologue saves your login in your browser's local storage, so you stay signed in. The demo version also keeps its sample
        data there. That's all: no cookies for tracking or advertising, no analytics, and the website's fonts come from our own
        site, not from Google.
      </P>

      <H2>How long we keep it</H2>
      <P>
        We keep your data while you have an account. When you delete your account (Settings → Delete account), we delete your
        account and everything you posted straight away. Server logs and backups at our providers expire on their own within a
        few weeks. Reports you made, and reports about you, are deleted with your account.
      </P>

      <H2>Your rights</H2>
      <P>Depending on where you live (for example under the EU's GDPR), you can:</P>
      <UL>
        <li><strong>See your data:</strong> Settings → Privacy &amp; data → <em>Download my data</em> gives you everything we store about you, in one file.</li>
        <li><strong>Correct it:</strong> edit your profile, email and survey choice in Settings.</li>
        <li><strong>Delete it:</strong> Settings → Delete account.</li>
        <li><strong>Withdraw research consent:</strong> switch it off in Settings at any time.</li>
        <li><strong>Object or ask questions:</strong> write to us at <Contact />.</li>
        <li><strong>Complain</strong> to your local data-protection authority if you think we've got something wrong.</li>
      </UL>

      <H2>Age</H2>
      <P>
        You must be at least 13 to use Prologue. If the law where you live sets a higher age for agreeing to this yourself
        (in parts of the EU it's up to 16), you need a parent's or guardian's permission.
      </P>

      <H2>Changes</H2>
      <P>
        If we change this policy in a way that matters, we'll tell you in the app before it applies, and update the date at the top.
      </P>

      <H2>Contact</H2>
      <P>Questions about your data or this policy: <Contact />.</P>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell title="Terms of Service">
      <P>
        These terms are the agreement between you and Prologue when you use the app. By creating an account you agree to them,
        and to handle your data as described in our <a href={`${import.meta.env.BASE_URL}privacy`} className="font-bold text-teal-700 underline">Privacy Policy</a>.
      </P>

      <H2>Your account</H2>
      <UL>
        <li>You must be at least 13 (or older where your local law requires; see the Privacy Policy).</li>
        <li>Give accurate information about yourself and your work. Don't pretend to be someone else or to hold a job or qualification you don't have.</li>
        <li>Keep your password to yourself. You're responsible for what happens under your account.</li>
        <li>One person, one account. Accounts are personal and can't be sold or handed over.</li>
      </UL>

      <H2>What you post</H2>
      <UL>
        <li><strong>It stays yours.</strong> You keep the rights to your posts, photos, comments and everything else you share.</li>
        <li>So that we can show it, you allow Prologue to store, display, and resize or format it within the service, for as long
          as it's on Prologue. When you delete it, or your account, this permission ends (copies may take a short time to leave backups).</li>
        <li>Only post what you have the right to share: your own photos and words, or material you have permission to use.</li>
        <li><strong>Protect other people's privacy</strong>, including clients, patients, passengers and colleagues. Don't post
          their names, faces, documents or anything that identifies them without permission, and respect any confidentiality
          your job requires.</li>
      </UL>

      <H2>Community rules</H2>
      <P>Don't post or do anything that:</P>
      <UL>
        <li>harasses, bullies, threatens or intimidates anyone;</li>
        <li>attacks people for who they are (for example their ethnicity, religion, gender, sexuality, disability or nationality);</li>
        <li>is sexual, violent or shocking;</li>
        <li>is spam, advertising nobody asked for, scams or misleading links;</li>
        <li>is dangerous or false information presented as fact;</li>
        <li>breaks the law or encourages others to;</li>
        <li>tries to break, overload, scrape or get around the limits and security of the service.</li>
      </UL>

      <H2>Not professional advice</H2>
      <P>
        Prologue is about sharing experience. Posts, answers and walkthroughs are people's own views and ways of working, not
        professional advice for your situation. For legal, medical, financial, safety or other important decisions, ask a qualified
        professional who knows your case. Follow your workplace's rules and the law. Use what you learn here at your own judgement.
      </P>

      <H2>Moderation</H2>
      <UL>
        <li>Anyone can report content or accounts, and block accounts they don't want contact with.</li>
        <li>Our moderators may remove content that breaks these terms, and suspend accounts that break them, especially repeatedly or seriously.
          A suspended account can't log in and its content is hidden.</li>
        <li>If you think we got it wrong, write to us at <Contact />.</li>
        <li>If you believe something on Prologue infringes your copyright or other rights, report it or write to us, telling us what it is and why.</li>
      </UL>

      <H2>The service</H2>
      <UL>
        <li>Prologue is free and provided as it is. We work to keep it running and your data safe, but we can't promise it will
          always be available or free of mistakes, and we may change or end features.</li>
        <li>As far as the law allows, we're not liable for indirect losses, or for what other users post or do. Nothing in these
          terms limits rights you have that can't be limited by law.</li>
      </UL>

      <H2>Leaving</H2>
      <P>
        You can delete your account at any time in Settings: your account and everything you posted are deleted. We may close
        accounts that seriously or repeatedly break these terms.
      </P>

      <H2>Changes to these terms</H2>
      <P>
        If we change these terms in a way that matters, we'll tell you in the app before the changes apply. If you don't agree
        with new terms, you can delete your account.
      </P>

      <H2>Contact</H2>
      <P>Questions about these terms: <Contact />.</P>
    </Shell>
  );
}
