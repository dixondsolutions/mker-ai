-- Create a function to keyword search for documents
create or replace function public.kw_match_documents(query_text text, match_count int)
    returns table
            (
                id         uuid,
                content    text,
                metadata   jsonb,
                similarity real
            )
as
$$

begin
    return query execute
        format('select id, content, metadata, ts_rank(to_tsvector(content), plainto_tsquery($1)) as similarity
from public.documents_embeddings
where to_tsvector(content) @@ plainto_tsquery($1)
order by similarity desc
limit $2')
        using query_text, match_count;
end;
$$ language plpgsql;

grant
    execute on function public.kw_match_documents to authenticated,
    service_role;