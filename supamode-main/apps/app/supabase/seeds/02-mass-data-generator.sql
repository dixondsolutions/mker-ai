-- =============================================
-- MASS DATA GENERATOR FOR CHART TESTING
-- =============================================
-- This script generates thousands of realistic data variations
-- for comprehensive chart and visualization testing

CREATE OR REPLACE PROCEDURE supamode.generate_mass_test_data(
    num_posts INTEGER DEFAULT 5000,
    num_comments INTEGER DEFAULT 15000,
    num_tags INTEGER DEFAULT 200,
    num_categories INTEGER DEFAULT 50
) LANGUAGE plpgsql 
SET search_path = ''
AS $$ 
DECLARE
    _category_ids UUID[];
    _tag_ids UUID[];
    _post_ids UUID[];
    _account_ids UUID[];
    _start_date TIMESTAMPTZ := '2020-01-01'::TIMESTAMPTZ;
    _end_date TIMESTAMPTZ := NOW();
    _current_date TIMESTAMPTZ;
    _random_date TIMESTAMPTZ;
    _post_id UUID;
    _category_id UUID;
    _tag_id UUID;
    _account_id UUID;
    _comment_id UUID;
    _i INTEGER;
    _j INTEGER;
    _k INTEGER;
BEGIN
    RAISE NOTICE 'Starting mass data generation...';
    RAISE NOTICE 'Target: % posts, % comments, % tags, % categories', num_posts, num_comments, num_tags, num_categories;

    -- Get existing account IDs
    SELECT ARRAY_AGG(id) INTO _account_ids FROM public.accounts;
    
    IF array_length(_account_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'No accounts found. Please run the demo schema seed first.';
    END IF;

    -- =============================================
    -- GENERATE DIVERSE CATEGORIES
    -- =============================================
    RAISE NOTICE 'Generating % categories...', num_categories;
    
    FOR _i IN 1..num_categories LOOP
        INSERT INTO public.categories (name, slug, description, color, sort_order, is_active)
        VALUES (
            -- Realistic category names with unique identifiers
            CASE (_i % 20)
                WHEN 0 THEN 'Technology ' || LPAD(_i::TEXT, 3, '0')
                WHEN 1 THEN 'Business ' || LPAD(_i::TEXT, 3, '0')
                WHEN 2 THEN 'Marketing ' || LPAD(_i::TEXT, 3, '0')
                WHEN 3 THEN 'Design ' || LPAD(_i::TEXT, 3, '0')
                WHEN 4 THEN 'Development ' || LPAD(_i::TEXT, 3, '0')
                WHEN 5 THEN 'Data Science ' || LPAD(_i::TEXT, 3, '0')
                WHEN 6 THEN 'AI & ML ' || LPAD(_i::TEXT, 3, '0')
                WHEN 7 THEN 'Productivity ' || LPAD(_i::TEXT, 3, '0')
                WHEN 8 THEN 'Leadership ' || LPAD(_i::TEXT, 3, '0')
                WHEN 9 THEN 'Finance ' || LPAD(_i::TEXT, 3, '0')
                WHEN 10 THEN 'Health & Wellness ' || LPAD(_i::TEXT, 3, '0')
                WHEN 11 THEN 'Education ' || LPAD(_i::TEXT, 3, '0')
                WHEN 12 THEN 'Travel ' || LPAD(_i::TEXT, 3, '0')
                WHEN 13 THEN 'Food & Cooking ' || LPAD(_i::TEXT, 3, '0')
                WHEN 14 THEN 'Sports & Fitness ' || LPAD(_i::TEXT, 3, '0')
                WHEN 15 THEN 'Entertainment ' || LPAD(_i::TEXT, 3, '0')
                WHEN 16 THEN 'Science ' || LPAD(_i::TEXT, 3, '0')
                WHEN 17 THEN 'Philosophy ' || LPAD(_i::TEXT, 3, '0')
                WHEN 18 THEN 'History ' || LPAD(_i::TEXT, 3, '0')
                ELSE 'General ' || LPAD(_i::TEXT, 3, '0')
            END,
            -- Slug
            'category-' || _i || '-' || LOWER(REPLACE(RANDOM()::TEXT, '0.', '')),
            -- Description
            'Category description for testing charts and analytics - ' || _i,
            -- Random colors
            CASE (_i % 10)
                WHEN 0 THEN '#FF6B6B'
                WHEN 1 THEN '#4ECDC4'
                WHEN 2 THEN '#45B7D1'
                WHEN 3 THEN '#96CEB4'
                WHEN 4 THEN '#FFEAA7'
                WHEN 5 THEN '#DDA0DD'
                WHEN 6 THEN '#98D8C8'
                WHEN 7 THEN '#F7DC6F'
                WHEN 8 THEN '#BB8FCE'
                ELSE '#85C1E9'
            END,
            _i,
            -- Randomly active/inactive
            (_i % 10) != 0
        );
    END LOOP;

    -- Get generated category IDs
    SELECT ARRAY_AGG(id) INTO _category_ids FROM public.categories;

    -- =============================================
    -- GENERATE DIVERSE TAGS
    -- =============================================
    RAISE NOTICE 'Generating % tags...', num_tags;
    
    FOR _i IN 1..num_tags LOOP
        INSERT INTO public.tags (name, slug, color, usage_count)
        VALUES (
            -- Realistic tag names with unique suffix to avoid duplicates
            CASE (_i % 30)
                WHEN 0 THEN 'react-' || _i
                WHEN 1 THEN 'javascript-' || _i
                WHEN 2 THEN 'typescript-' || _i
                WHEN 3 THEN 'python-' || _i
                WHEN 4 THEN 'nodejs-' || _i
                WHEN 5 THEN 'postgresql-' || _i
                WHEN 6 THEN 'supabase-' || _i
                WHEN 7 THEN 'nextjs-' || _i
                WHEN 8 THEN 'vue-' || _i
                WHEN 9 THEN 'angular-' || _i
                WHEN 10 THEN 'docker-' || _i
                WHEN 11 THEN 'kubernetes-' || _i
                WHEN 12 THEN 'aws-' || _i
                WHEN 13 THEN 'firebase-' || _i
                WHEN 14 THEN 'graphql-' || _i
                WHEN 15 THEN 'rest-api-' || _i
                WHEN 16 THEN 'machine-learning-' || _i
                WHEN 17 THEN 'data-visualization-' || _i
                WHEN 18 THEN 'css-' || _i
                WHEN 19 THEN 'html-' || _i
                WHEN 20 THEN 'webpack-' || _i
                WHEN 21 THEN 'vite-' || _i
                WHEN 22 THEN 'tailwind-' || _i
                WHEN 23 THEN 'bootstrap-' || _i
                WHEN 24 THEN 'sass-' || _i
                WHEN 25 THEN 'mongodb-' || _i
                WHEN 26 THEN 'redis-' || _i
                WHEN 27 THEN 'elasticsearch-' || _i
                WHEN 28 THEN 'github-' || _i
                ELSE 'tag-' || _i
            END,
            'tag-' || _i || '-' || LOWER(REPLACE(RANDOM()::TEXT, '0.', '')),
            -- Random tag colors
            CASE (_i % 8)
                WHEN 0 THEN '#E74C3C'
                WHEN 1 THEN '#3498DB'
                WHEN 2 THEN '#2ECC71'
                WHEN 3 THEN '#F39C12'
                WHEN 4 THEN '#9B59B6'
                WHEN 5 THEN '#1ABC9C'
                WHEN 6 THEN '#34495E'
                ELSE '#7F8C8D'
            END,
            -- Random usage count (0-1000)
            FLOOR(RANDOM() * 1000)::INTEGER
        );
    END LOOP;

    -- Get generated tag IDs
    SELECT ARRAY_AGG(id) INTO _tag_ids FROM public.tags;

    -- =============================================
    -- GENERATE DIVERSE POSTS WITH TIME DISTRIBUTION
    -- =============================================
    RAISE NOTICE 'Generating % posts...', num_posts;
    
    FOR _i IN 1..num_posts LOOP
        -- Generate realistic date distribution (more recent posts)
        _current_date := _start_date + (
            -- Exponential distribution favoring recent dates
            INTERVAL '1 day' * (
                EXTRACT(EPOCH FROM (_end_date - _start_date)) / 86400 * 
                (1 - POWER(RANDOM(), 2)) -- Exponential curve
            )
        );

        -- Select random category and account
        _category_id := _category_ids[1 + FLOOR(RANDOM() * array_length(_category_ids, 1))];
        _account_id := _account_ids[1 + FLOOR(RANDOM() * array_length(_account_ids, 1))];

        INSERT INTO public.posts (
            title, 
            slug, 
            excerpt, 
            content, 
            content_markdown, 
            status, 
            author_id, 
            category_id, 
            published_at,
            view_count,
            comment_count,
            allow_comments,
            is_featured,
            meta_title,
            meta_description,
            created_at,
            updated_at
        ) VALUES (
            -- Realistic titles
            CASE (_i % 25)
                WHEN 0 THEN 'Getting Started with Modern Web Development ' || _i
                WHEN 1 THEN 'Advanced Database Optimization Techniques ' || _i
                WHEN 2 THEN 'Building Scalable Applications with ' || (_i % 5 + 2020)
                WHEN 3 THEN 'The Future of JavaScript Frameworks ' || _i
                WHEN 4 THEN 'Data Visualization Best Practices ' || _i
                WHEN 5 THEN 'Performance Monitoring and Analytics ' || _i
                WHEN 6 THEN 'Security Patterns for Modern Apps ' || _i
                WHEN 7 THEN 'Machine Learning in Production ' || _i
                WHEN 8 THEN 'Cloud Architecture Design Patterns ' || _i
                WHEN 9 THEN 'API Design and Documentation ' || _i
                WHEN 10 THEN 'Testing Strategies for Large Codebases ' || _i
                WHEN 11 THEN 'DevOps Best Practices ' || (_i % 3 + 2021)
                WHEN 12 THEN 'Mobile-First Development Approach ' || _i
                WHEN 13 THEN 'Microservices vs Monoliths ' || _i
                WHEN 14 THEN 'Database Migration Strategies ' || _i
                WHEN 15 THEN 'Real-time Applications with WebSockets ' || _i
                WHEN 16 THEN 'GraphQL vs REST API Comparison ' || _i
                WHEN 17 THEN 'Container Orchestration Guide ' || _i
                WHEN 18 THEN 'Monitoring and Observability ' || _i
                WHEN 19 THEN 'Automated Testing Pipelines ' || _i
                WHEN 20 THEN 'Code Review Best Practices ' || _i
                WHEN 21 THEN 'Agile Development Methodologies ' || _i
                WHEN 22 THEN 'Technical Debt Management ' || _i
                WHEN 23 THEN 'System Design Interview Prep ' || _i
                ELSE 'Advanced Tutorial Series Part ' || _i
            END,
            -- Unique slug
            'post-' || _i || '-' || EXTRACT(EPOCH FROM _current_date)::BIGINT || '-' || LOWER(REPLACE(RANDOM()::TEXT, '0.', '')),
            -- Excerpt
            'This is a comprehensive guide covering advanced topics and practical examples. Learn industry best practices and real-world applications.',
            -- Content (longer, realistic)
            'This is the full content of post number ' || _i || '. It contains detailed explanations, code examples, and practical insights. ' ||
            'The post covers various aspects of the topic, including implementation details, common pitfalls, and optimization strategies. ' ||
            'With examples and real-world use cases, this content provides valuable insights for developers and technical professionals.',
            -- Markdown content
            '# Post Title ' || _i || chr(10) || chr(10) ||
            '## Introduction' || chr(10) ||
            'This post covers important concepts and practical applications.' || chr(10) || chr(10) ||
            '## Key Points' || chr(10) ||
            '- Point 1: Important concept' || chr(10) ||
            '- Point 2: Practical application' || chr(10) ||
            '- Point 3: Best practices' || chr(10) || chr(10) ||
            '## Conclusion' || chr(10) ||
            'Summary and next steps.',
            -- Status distribution (80% published, 15% draft, 5% archived)
            CASE 
                WHEN (_i % 20) < 16 THEN 'published'::public.content_status
                WHEN (_i % 20) < 19 THEN 'draft'::public.content_status
                ELSE 'archived'::public.content_status
            END,
            _account_id,
            _category_id,
            -- Published date (only for published posts)
            CASE 
                WHEN (_i % 20) < 16 THEN _current_date
                ELSE NULL
            END,
            -- Realistic view counts (0-10000, with power distribution)
            FLOOR(POWER(RANDOM(), 0.5) * 10000)::INTEGER,
            -- Comment count (will be updated by trigger)
            0,
            -- Allow comments (90% true)
            (_i % 10) != 0,
            -- Featured posts (5% featured)
            (_i % 20) = 0,
            -- Meta title
            'SEO Title for Post ' || _i,
            -- Meta description
            'SEO description providing a summary of the post content and encouraging clicks from search results.',
            _current_date,
            _current_date
        );
    END LOOP;

    -- Get generated post IDs
    SELECT ARRAY_AGG(id) INTO _post_ids FROM public.posts;

    -- =============================================
    -- GENERATE POST-TAG RELATIONSHIPS
    -- =============================================
    RAISE NOTICE 'Generating post-tag relationships...';
    
    FOR _i IN 1..array_length(_post_ids, 1) LOOP
        _post_id := _post_ids[_i];
        
        -- Each post gets 1-5 random tags
        FOR _j IN 1..(1 + FLOOR(RANDOM() * 5)) LOOP
            _tag_id := _tag_ids[1 + FLOOR(RANDOM() * array_length(_tag_ids, 1))];
            
            -- Insert if not exists (avoid duplicates)
            INSERT INTO public.post_tags (post_id, tag_id)
            VALUES (_post_id, _tag_id)
            ON CONFLICT (post_id, tag_id) DO NOTHING;
        END LOOP;
    END LOOP;

    -- =============================================
    -- GENERATE DIVERSE COMMENTS
    -- =============================================
    RAISE NOTICE 'Generating % comments...', num_comments;
    
    FOR _i IN 1..num_comments LOOP
        -- Select random post and account
        _post_id := _post_ids[1 + FLOOR(RANDOM() * array_length(_post_ids, 1))];
        
        -- 70% registered users, 30% guest comments
        IF (_i % 10) < 7 THEN
            _account_id := _account_ids[1 + FLOOR(RANDOM() * array_length(_account_ids, 1))];
        ELSE
            _account_id := NULL;
        END IF;

        -- Random date between post creation and now
        _random_date := (
            SELECT created_at + (NOW() - created_at) * RANDOM() 
            FROM public.posts 
            WHERE id = _post_id
        );

        INSERT INTO public.comments (
            content,
            status,
            post_id,
            author_id,
            guest_name,
            guest_email,
            created_at,
            updated_at
        ) VALUES (
            -- Realistic comment content
            CASE (_i % 15)
                WHEN 0 THEN 'Great article! Very helpful and well-written. Thanks for sharing your insights.'
                WHEN 1 THEN 'I have a question about the implementation details. Could you elaborate on the approach?'
                WHEN 2 THEN 'This solved my problem perfectly. Excellent tutorial with clear examples.'
                WHEN 3 THEN 'Interesting perspective. I would also consider alternative approaches for scalability.'
                WHEN 4 THEN 'Thanks for the detailed explanation. The code examples are very useful.'
                WHEN 5 THEN 'I encountered an issue following step 3. Has anyone else faced this problem?'
                WHEN 6 THEN 'Excellent post! This is exactly what I was looking for. Bookmarked for later reference.'
                WHEN 7 THEN 'Could you provide more information about performance implications of this approach?'
                WHEN 8 THEN 'Well researched article. The comparisons between different methods are very valuable.'
                WHEN 9 THEN 'I implemented this solution and it works great. Minor suggestion for improvement: consider edge cases.'
                WHEN 10 THEN 'Thank you for sharing your experience. This will save me a lot of debugging time.'
                WHEN 11 THEN 'Great tutorial series. Looking forward to the next part covering advanced topics.'
                WHEN 12 THEN 'The examples are clear and easy to follow. Perfect for beginners and intermediate developers.'
                WHEN 13 THEN 'I disagree with some points, but overall this is a solid foundation for understanding the topic.'
                ELSE 'This is comment number ' || _i || '. Great content and very informative post!'
            END,
            -- Comment status distribution (85% approved, 10% pending, 5% spam)
            CASE 
                WHEN (_i % 20) < 17 THEN 'approved'::public.comment_status
                WHEN (_i % 20) < 19 THEN 'pending'::public.comment_status
                ELSE 'spam'::public.comment_status
            END,
            _post_id,
            _account_id,
            -- Guest name (for guest comments)
            CASE 
                WHEN _account_id IS NULL THEN 
                    CASE (_i % 10)
                        WHEN 0 THEN 'John Smith'
                        WHEN 1 THEN 'Sarah Johnson'
                        WHEN 2 THEN 'Mike Davis'
                        WHEN 3 THEN 'Emily Chen'
                        WHEN 4 THEN 'David Wilson'
                        WHEN 5 THEN 'Lisa Anderson'
                        WHEN 6 THEN 'Alex Brown'
                        WHEN 7 THEN 'Maria Garcia'
                        WHEN 8 THEN 'James Taylor'
                        ELSE 'Guest User ' || _i
                    END
                ELSE NULL
            END,
            -- Guest email (for guest comments)
            CASE 
                WHEN _account_id IS NULL THEN 'guest' || _i || '@example.com'
                ELSE NULL
            END,
            _random_date,
            _random_date
        );
    END LOOP;

    -- =============================================
    -- GENERATE SITE SETTINGS VARIATIONS
    -- =============================================
    RAISE NOTICE 'Generating site settings...';
    
    INSERT INTO public.site_settings (key, value, description, category) VALUES
        ('analytics_enabled', 'true', 'Enable analytics tracking', 'analytics'),
        ('max_posts_per_page', '25', 'Maximum posts displayed per page', 'display'),
        ('comment_moderation', 'auto', 'Comment moderation setting', 'comments'),
        ('site_theme', 'dark', 'Default site theme', 'appearance'),
        ('email_notifications', 'true', 'Enable email notifications', 'notifications'),
        ('cache_duration', '3600', 'Cache duration in seconds', 'performance'),
        ('max_file_upload', '10485760', 'Maximum file upload size in bytes', 'uploads'),
        ('maintenance_mode', 'false', 'Site maintenance mode', 'system'),
        ('api_rate_limit', '100', 'API requests per minute limit', 'api'),
        ('backup_frequency', 'daily', 'Database backup frequency', 'backup')
    ON CONFLICT (key) DO NOTHING;

    -- Update tag usage counts based on actual usage
    UPDATE public.tags SET usage_count = (
        SELECT COUNT(*) FROM public.post_tags WHERE tag_id = public.tags.id
    );

    -- Update post comment counts
    UPDATE public.posts SET comment_count = (
        SELECT COUNT(*) FROM public.comments 
        WHERE post_id = public.posts.id AND status = 'approved'
    );

    RAISE NOTICE 'Mass data generation completed successfully!';
    RAISE NOTICE 'Generated: % posts, % comments, % tags, % categories', 
                 (SELECT COUNT(*) FROM public.posts),
                 (SELECT COUNT(*) FROM public.comments), 
                 (SELECT COUNT(*) FROM public.tags),
                 (SELECT COUNT(*) FROM public.categories);
END$$;

-- Grant execute permission
GRANT EXECUTE ON PROCEDURE supamode.generate_mass_test_data(INTEGER, INTEGER, INTEGER, INTEGER) TO service_role;

-- =============================================
-- CONVENIENCE PROCEDURES FOR DIFFERENT SCALES
-- =============================================

-- Small dataset (for development)
CREATE OR REPLACE PROCEDURE supamode.generate_small_test_data() 
LANGUAGE plpgsql AS $$
BEGIN
    CALL supamode.generate_mass_test_data(500, 1500, 50, 15);
END$$;

-- Medium dataset (for staging)
CREATE OR REPLACE PROCEDURE supamode.generate_medium_test_data() 
LANGUAGE plpgsql AS $$
BEGIN
    CALL supamode.generate_mass_test_data(2000, 8000, 100, 30);
END$$;

-- Large dataset (for production testing)
CREATE OR REPLACE PROCEDURE supamode.generate_large_test_data() 
LANGUAGE plpgsql AS $$
BEGIN
    CALL supamode.generate_mass_test_data(10000, 50000, 500, 100);
END$$;

-- Extra large dataset (for performance testing)
CREATE OR REPLACE PROCEDURE supamode.generate_xlarge_test_data() 
LANGUAGE plpgsql AS $$
BEGIN
    CALL supamode.generate_mass_test_data(25000, 100000, 1000, 200);
END$$;

GRANT EXECUTE ON PROCEDURE supamode.generate_small_test_data() TO service_role;
GRANT EXECUTE ON PROCEDURE supamode.generate_medium_test_data() TO service_role;
GRANT EXECUTE ON PROCEDURE supamode.generate_large_test_data() TO service_role;
GRANT EXECUTE ON PROCEDURE supamode.generate_xlarge_test_data() TO service_role;

-- =============================================
-- CLEANUP PROCEDURE
-- =============================================

CREATE OR REPLACE PROCEDURE supamode.cleanup_test_data()
LANGUAGE plpgsql AS $$
BEGIN
    RAISE NOTICE 'Cleaning up generated test data...';
    
    DELETE FROM public.post_tags WHERE post_id NOT IN (
        SELECT id FROM public.posts WHERE title LIKE 'Hello Supabase' OR title LIKE 'PostgreSQL Tips'
    );
    
    DELETE FROM public.comments WHERE post_id NOT IN (
        SELECT id FROM public.posts WHERE title LIKE 'Hello Supabase' OR title LIKE 'PostgreSQL Tips'
    );
    
    DELETE FROM public.posts WHERE title NOT LIKE 'Hello Supabase' AND title NOT LIKE 'PostgreSQL Tips';
    
    DELETE FROM public.categories WHERE name NOT LIKE 'Technology' AND name NOT LIKE 'Lifestyle';
    
    DELETE FROM public.tags WHERE name NOT LIKE 'Postgres' AND name NOT LIKE 'Supabase';
    
    DELETE FROM public.site_settings WHERE key NOT IN ('site_title', 'homepage_layout');
    
    RAISE NOTICE 'Test data cleanup completed';
END$$;

GRANT EXECUTE ON PROCEDURE supamode.cleanup_test_data() TO service_role;