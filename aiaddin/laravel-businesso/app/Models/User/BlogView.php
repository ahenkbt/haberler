<?php

namespace App\Models\User;

use App\Models\Blog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BlogView extends Model
{
    use HasFactory;
    protected $fillable = ['post_id', 'user_id', 'ip', 'author_id'];
    protected $table = 'user_blog_views';

    public function post()
    {
        return $this->belongsTo(Blog::class);
    }

    public function viewByUser()
    {
        return $this->belongsTo(User::class);
    }
}
