<?php

namespace App\Models\User\CourseManagement;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseReview extends Model
{
    use HasFactory;
    protected $table = 'user_course_reviews';
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'customer_id',
        'course_id',
        'comment',
        'rating'
    ];

    public function userInfo()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function customerInfo()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function courseInfo()
    {
        return $this->belongsTo(Course::class, 'course_id', 'id');
    }
}
