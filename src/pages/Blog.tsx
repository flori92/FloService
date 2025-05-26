import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Blog: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Blog</h1>
        <div className="text-center py-12">
          <p className="text-gray-600">Coming soon...</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;