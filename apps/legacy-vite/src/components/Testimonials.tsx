import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  client: {
    full_name: string;
  };
  provider: {
    business_name: string;
  };
}

const Testimonial: React.FC<{ review: Review; delay: number }> = ({ 
  review,
  delay 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="bg-white rounded-xl shadow-lg p-8 relative"
    >
      <Quote className="absolute top-6 right-6 h-8 w-8 text-indigo-100" />
      <div className="flex mb-4">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
      </div>
      <p className="text-gray-700 text-lg leading-relaxed mb-6">{review.comment}</p>
      <div className="flex items-center">
        <div>
          <h4 className="font-semibold text-gray-900">{review.client.full_name}</h4>
          <p className="text-gray-600">
            Client de <span className="text-indigo-600">{review.provider.business_name}</span>
            <br />
            <span className="text-sm text-gray-500">
              {format(new Date(review.created_at), 'dd MMMM yyyy', { locale: fr })}
            </span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const Testimonials: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            client:client_id (full_name),
            provider:provider_id (business_name)
          `)
          .gte('rating', 4)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;
        setReviews(data || []);
      } catch (error) {
        console.error('Error loading reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();

    // Subscribe to new reviews
    const subscription = supabase
      .channel('reviews')
      .on('INSERT', { event: '*', schema: 'public', table: 'reviews' }, 
        async (payload) => {
          if (payload.new.rating >= 4) {
            const { data, error } = await supabase
              .from('reviews')
              .select(`
                id,
                rating,
                comment,
                created_at,
                client:client_id (full_name),
                provider:provider_id (business_name)
              `)
              .eq('id', payload.new.id)
              .single();

            if (!error && data) {
              setReviews(prev => [data, ...prev].slice(0, 6));
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section id="testimonials" className="py-20 bg-gradient-to-b from-white to-indigo-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-indigo-600 font-semibold text-sm uppercase tracking-wider"
          >
            Témoignages
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mt-4 mb-4"
          >
            Ce que disent nos clients
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Découvrez les expériences de nos clients satisfaits
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <Testimonial
              key={review.id}
              review={review}
              delay={0.1 + index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;