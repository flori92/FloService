import { useEffect, useState } from 'react';

export function useScrollAnimation() {
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100 && !hasAnimated) {
        setHasAnimated(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasAnimated]);

  return hasAnimated;
}

export function useSmoothScroll() {
  useEffect(() => {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href')?.substring(1);
        if (!targetId) return;
        
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;
        
        window.scrollTo({
          top: targetElement.offsetTop,
          behavior: 'smooth'
        });
      });
    });
    
    return () => {
      links.forEach(link => {
        link.removeEventListener('click', () => {});
      });
    };
  }, []);
}