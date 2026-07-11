<?php

namespace App\Models\User;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookmarkPost extends Model
{
    use HasFactory;

    protected $table = 'user_bookmark_posts';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['user_id', 'post_id', 'author_id'];

    public function bookmarkedByCustomer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function post()
    {
        return $this->belongsTo(Blog::class);
    }
}
