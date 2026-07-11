<?php

namespace App\Models\User\CourseManagement;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonContentComplete extends Model
{
    use HasFactory;

    protected $table = 'user_lesson_content_complete';
    public $timestamps = false;

    protected $fillable = [
        'lesson_id',
        'user_id',
        'customer_id',
        'lesson_content_id',
        'type'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'user_id', 'id');
    }

    public function lesson_content()
    {
        return $this->belongsTo(LessonContent::class, 'lesson_content_id', 'id');
    }
}
